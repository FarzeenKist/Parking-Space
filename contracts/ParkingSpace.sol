// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ParkingSpace is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private totalParkings;
    Counters.Counter private blacklistCount;

    /// @dev additional time given to renters to close their account with a rented lot
    uint256 public additionalTime;

    uint minPrice;

    address payable contractOwner;

    /// @dev keeps track of the addresses that has been blacklisted
    mapping(address => bool) public blacklisted;

    uint256 private mintFee;

    /// @dev the maximum allowed lots to rent at a time
    uint256 maxLotPerWallet;

    /// @dev this keeps tracks parking lots each wallet is renting
    mapping(address => uint256) public parkingLotsPerWallet;

    mapping(uint256 => Lot) private parkingLots;

    enum Listing {
        Sale,
        Rent,
        Unavailable,
        Rented
    }

    /// @param status represents one of the four states in Listing
    /// @param returnDay is the timestamp for day of return
    /// @param rentTime is the number of days of rent
    /// @param deposit is the percentage deposit to rent lot
    /// @param price is the fee to rent per day
    struct Lot {
        address payable lender;
        address payable renter;
        // price of lot
        uint256 price;
        // rentPrice is per day
        uint rentPrice;
        // deposit is a percentage
        uint256 deposit;
        uint256 returnDay;
        uint256 rentTime;
        Listing status;
    }

    constructor() ERC721("ParkingSpace", "PS") {
        // 5 hours additional time for user to end due rent
        additionalTime = 5 hours;
        contractOwner = payable(msg.sender);
        maxLotPerWallet = 10;
        mintFee = 1 ether;
        minPrice = 1 ether;
    }

    // checks if desired lot is available
    modifier isAvailable(uint256 tokenId) {
        require(
            parkingLots[tokenId].status != Listing.Rented,
            "Parking lot is current unavailable!"
        );
        _;
    }

    // this checks if the renting period of a lot is over
    // this modifier also gives a deadline of 2 days to the renter to close his account with the current lot
    modifier rentOver(uint256 tokenId) {
        require(
            block.timestamp > parkingLots[tokenId].returnDay + additionalTime &&
                parkingLots[tokenId].status == Listing.Rent,
            "Someone has already rented this lot!"
        );
        _;
    }

    // checks if current wallet has already reached the limit of lots they can rent
    modifier lotLimit() {
        require(
            parkingLotsPerWallet[msg.sender] <= maxLotPerWallet,
            "You have reached the number of Lots you can rent"
        );
        _;
    }

    /// @dev This function creates a parking lot
    /// @notice Lot.renter is initialized in the same way as the lender
    function createLot(string memory uri)
        external
        payable
        lotLimit
        nonReentrant
    {
        require(bytes(uri).length > 15, "Uri has to be valid");
        require(msg.value == mintFee, "You need to pay the mint fee");

        uint256 tokenId = totalParkings.current();
        totalParkings.increment();
        parkingLots[tokenId] = Lot(
            payable(msg.sender),
            payable(msg.sender),
            0, // price initialised as zero
            0, // rentPrice initialised as zero
            0, //deposit initialised as zero
            0, //returnDay initialised as zero
            0, //rentTime initialised as zero
            Listing.Unavailable
        );
        parkingLotsPerWallet[msg.sender]++;

        // fee is paid
        (bool success, ) = contractOwner.call{value: msg.value}("");
        require(success, "Payment failed for mint fee");

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function setUnavailable(uint256 tokenId) public isAvailable(tokenId) {
        parkingLots[tokenId].status = Listing.Unavailable;
        parkingLots[tokenId].deposit = 0;
        parkingLots[tokenId].price = 0;
        parkingLots[tokenId].rentPrice = 0;
        if (ownerOf(tokenId) == address(this)) {
            _transfer(address(this), msg.sender, tokenId);
        }
    }

    function setSale(uint256 tokenId, uint256 price)
        public
        isAvailable(tokenId)
    {
        Lot storage currentLot = parkingLots[tokenId];
        require(price > 0, "Enter valid price");
        require(
            msg.sender == currentLot.lender,
            "Only the owner can perform this action"
        );
        currentLot.status = Listing.Sale;
        currentLot.rentPrice = 0;
        currentLot.price = price;
        currentLot.deposit = 0;
        if (ownerOf(tokenId) == msg.sender) {
            _transfer(msg.sender, address(this), tokenId);
        }
    }

    function setRent(
        uint256 tokenId,
        uint256 price,
        uint256 deposit
    ) public isAvailable(tokenId) {
        Lot storage currentLot = parkingLots[tokenId];
        require(
            price > 0 && deposit <= 100,
            "Enter valid price and depsoit amount"
        );
        require(
            msg.sender == currentLot.lender,
            "Only the owner can perform this action"
        );
        currentLot.status = Listing.Rent;
        if (ownerOf(tokenId) == address(this)) {
            _transfer(address(this), msg.sender, tokenId);
        }
        _approve(address(this), tokenId);
        currentLot.rentPrice = price;
        currentLot.price = 0;
        currentLot.deposit = deposit;
    }

    function buyLot(uint256 tokenId) external payable nonReentrant {
        Lot storage currentLot = parkingLots[tokenId];
        require(
            msg.value == parkingLots[tokenId].price,
            "You need to match the selling price"
        );
        require(currentLot.status == Listing.Sale, "Lot isn't on sale");
        require(msg.sender != currentLot.lender, "You can't buy your own Lot");

        address payable lotOwner = currentLot.lender;
        currentLot.lender = payable(msg.sender);
        currentLot.renter = payable(msg.sender);
        currentLot.price = 0;
        currentLot.status = Listing.Unavailable;
        _transfer(address(this), msg.sender, tokenId);
        uint256 amount = msg.value;
        (bool success, ) = lotOwner.call{value: amount}("");
        require(success, "Payment to buy lot failed");
    }

    /// @dev Rents a selected Lot to the caller
    /// @param _time is assumed to be in seconds, representing the number of days to rent
    function rentLot(uint256 tokenId, uint256 _time)
        external
        payable
        isAvailable(tokenId)
        rentOver(tokenId)
    {
        require(
            !blacklisted[msg.sender],
            "you are blacklisted from using the platform"
        );
        Lot storage currentLot = parkingLots[tokenId];
        require(
            msg.sender != currentLot.renter,
            "You are currently renting this apartment"
        );
        require(_time >= 1 days, "Time needs to be at least one day");
        // deposit is calculated bv the percentage set by lender multiplied by the total fee
        uint256 amount = getRentPrice(tokenId, _time, 1);
        require(msg.value == amount, "You need to pay to rent lot");
        currentLot.renter = payable(msg.sender);
        currentLot.rentTime = _time;
        currentLot.returnDay = block.timestamp + _time;
        currentLot.status = Listing.Rented;
        _transfer(currentLot.lender, msg.sender, tokenId);
        _approve(address(this), tokenId);
        (bool success, ) = currentLot.lender.call{value: amount}("");
        require(success, "Payment to rent lot failed");
    }

    /// @dev this is a helper function to reset values and transfer lot back to lender
    function endRentHelper(uint256 tokenId) private {
        Lot storage currentLot = parkingLots[tokenId];
        address renter = currentLot.renter;
        // Changes is made to the lot to make it available for renting again
        currentLot.returnDay = 0;
        currentLot.rentTime = 0;
        currentLot.renter = payable(currentLot.lender);
        currentLot.status = Listing.Rent;
        _transfer(renter, currentLot.lender, tokenId);
    }

    /// @dev this function is used by the renter to end the rent and pay the remaining fees(if any) to the lender
    function clientEndRent(uint256 tokenId) external payable nonReentrant {
        Lot memory currentLot = parkingLots[tokenId];
        require(
            currentLot.renter == msg.sender,
            "Only the renter can end the rent"
        );
        require(
            block.timestamp <= currentLot.returnDay + additionalTime,
            "You have been blacklisted due to late return of lot"
        );

        // if deposit is 100% then there is no need to pay the lender again
        if (currentLot.deposit < 100) {
            uint256 amount = getRentPrice(tokenId, currentLot.rentTime, 3);
            require(
                msg.value == amount,
                "You need to pay the remaining fees to end rent"
            );
            (bool success, ) = currentLot.lender.call{value: amount}("");
            require(success, "Payment to end rent failed");
        }
        endRentHelper(tokenId);
    }

    // this function is used by the lender in the situation that the renter hasn't return the lot after the deadline and additional time
    function lenderEndRent(uint256 tokenId) external payable {
        Lot storage currentLot = parkingLots[tokenId];
        require(
            currentLot.lender == msg.sender,
            "Only lender can end the rent"
        );
        require(
            block.timestamp > currentLot.returnDay + additionalTime,
            "There is still time left for renter to return the lot!"
        );
        blacklistCount.increment();
        // renter is now blacklisted
        blacklisted[currentLot.renter] = true;
        endRentHelper(tokenId);
    }

    function getLot(uint256 tokenId) public view returns (Lot memory) {
        require(_exists(tokenId));
        return parkingLots[tokenId];
    }

        function getRentPrice(
        uint256 tokenId,
        uint256 _time,
        uint _status
    ) public view returns (uint256) {
        Lot storage currentLot = parkingLots[tokenId];
        uint price = currentLot.rentPrice / 100;
        if (_status == uint(Listing.Rented)) {
           return (100 - currentLot.deposit) * price * (_time/ 1 days);
        } else if (_status == uint(Listing.Rent)) {
            return currentLot.deposit * price * (_time/ 1 days);
        }else{
            return 0;
        }
    }

    function getParkingLotsLength() public view returns (uint256) {
        return totalParkings.current();
    }

    function getBlacklistCount() public view returns (uint256) {
        return blacklistCount.current();
    }

    function getMaxLotPerWallet() public view returns (uint256) {
        return maxLotPerWallet;
    }

    function getMintFee() public view returns (uint256) {
        return mintFee;
    }

    // The following functions are overrides required by Solidity.

    // Changes is made to approve to prevent the renter from stealing the token
    function approve(address to, uint256 _tokenId) public override {
        require(
            msg.sender == parkingLots[_tokenId].lender,
            "Caller has to be owner of NFT"
        );
        super.approve(to, _tokenId);
    }

    /**
     * @dev See {IERC721-transferFrom}.
     * Changes is made to transferFrom to prevent the renter from stealing the token
     */
    function transferFrom(
        address from,
        address to,
        uint256 _tokenId
    ) public override {
        require(
            msg.sender == parkingLots[_tokenId].lender,
            "Caller has to be owner of NFT"
        );
        super.transferFrom(from, to, _tokenId);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     * Changes is made to safeTransferFrom to prevent the renter from stealing the token
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 _tokenId,
        bytes memory data
    ) public override {
        require(
            msg.sender == parkingLots[_tokenId].lender,
            "Caller has to be owner of NFT"
        );
        _safeTransfer(from, to, _tokenId, data);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
