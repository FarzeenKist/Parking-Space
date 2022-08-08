// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title A marketplace primarily built for renting and selling parkings

contract ParkingSpace is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private totalParkings;

    // additional time given to renters to close their account with a rented lot
    uint256 public additionalTime;

    // variable which sets the smallest required amount when setting a sale/rent price
    uint private minPrice;

    /// @dev keeps track of the addresses that has been blacklisted from being to rent or buying lots
    mapping(address => bool) public blacklisted;

    uint256 private mintFee;

    /// @dev the maximum allowed lots to rent at a time
    uint256 maxLotPerWallet;

    mapping(uint256 => Lot) private parkingLots;

    enum Listing {
        Sale,
        Rent,
        Unavailable,
        Rented
    }

    /// @param lender is the current owner of the parking lot
    /// @param status represents one of the four states in enum Listing
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
        maxLotPerWallet = 10;
        mintFee = 1 ether;
        minPrice = 1 ether;
    }

    /// @dev checks if desired lot is not being rented
    modifier isAvailable(uint256 tokenId) {
        require(
            parkingLots[tokenId].status != Listing.Rented,
            "Parking lot is currently being rented!"
        );
        _;
    }

    /// @dev Checks if the caller is the owner of the lot
    modifier onlyLender(uint256 tokenId) {
        require(
            parkingLots[tokenId].lender == msg.sender,
            "Only the owner can perform this action"
        );
        _;
    }

    /// @dev checks if caller is not the owner of the lot
    modifier notLender(uint256 tokenId) {
        require(
            msg.sender != parkingLots[tokenId].lender,
            "The owner cannot perform this action"
        );
        _;
    }

    /// @dev checks if price is equal or greater than the minPrice
    modifier checkPrice(uint _price) {
        require(_price >= minPrice, "Enter valid price");
        _;
    }

    /// @dev checks if caller is blacklisted
    modifier isBlacklisted() {
        require(
            !blacklisted[msg.sender],
            "you are blacklisted from using the platform"
        );
        _;
    }

    /// @dev This function creates a parking lot
    /// @notice Lot.renter is initialized in the same way as the lender
    function createLot(string memory uri)
        external
        payable
        isBlacklisted
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
        // fee is paid
        (bool success, ) = payable(owner()).call{value: msg.value}("");
        require(success, "Payment failed for mint fee");

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /// @dev sets status of parking lot to unavailable
    /// @notice if lot is currently held by the marketplace, it is transferred back to the owner
    function setUnavailable(uint256 tokenId)
        public
        isAvailable(tokenId)
        onlyLender(tokenId)
    {
        parkingLots[tokenId].status = Listing.Unavailable;
        parkingLots[tokenId].deposit = 0;
        parkingLots[tokenId].price = 0;
        parkingLots[tokenId].rentPrice = 0;
        if (ownerOf(tokenId) == address(this)) {
            _transfer(address(this), msg.sender, tokenId);
        }
    }

    /// @dev sets status of parking lot to sale
    /// @notice if lot is currently held by the owner, it is transferred to the marketplace
    function setSale(uint256 tokenId, uint256 _price)
        public
        isAvailable(tokenId)
        onlyLender(tokenId)
        checkPrice(_price)
    {
        Lot storage currentLot = parkingLots[tokenId];
        currentLot.status = Listing.Sale;
        currentLot.rentPrice = 0;
        currentLot.price = _price;
        currentLot.deposit = 0;
        if (ownerOf(tokenId) == msg.sender) {
            _transfer(msg.sender, address(this), tokenId);
        }
    }

    /// @dev set status of parking lot to rent
    /// @notice if lot is currently held by the marketplace, it is transferred back to the owner
    function setRent(
        uint256 tokenId,
        uint256 _price,
        uint256 deposit
    ) public isAvailable(tokenId) onlyLender(tokenId) checkPrice(_price) {
        Lot storage currentLot = parkingLots[tokenId];
        require(deposit <= 100, "Enter valid depsoit amount");
        currentLot.status = Listing.Rent;
        if (ownerOf(tokenId) == address(this)) {
            _transfer(address(this), msg.sender, tokenId);
        }
        _approve(address(this), tokenId);
        currentLot.rentPrice = _price;
        currentLot.price = 0;
        currentLot.deposit = deposit;
    }

    /// @dev buys a lot for sale on marketplace
    /// @notice lot is transferred from marketplace to the new owner
    function buyLot(uint256 tokenId)
        external
        payable
        isBlacklisted
        nonReentrant
        notLender(tokenId)
    {
        Lot storage currentLot = parkingLots[tokenId];
        require(
            msg.value == parkingLots[tokenId].price,
            "You need to match the selling price"
        );
        require(currentLot.status == Listing.Sale, "Lot isn't on sale");

        address payable lotOwner = currentLot.lender;
        currentLot.lender = payable(msg.sender);
        currentLot.renter = payable(msg.sender);
        currentLot.price = 0;
        currentLot.status = Listing.Unavailable;
        _transfer(address(this), msg.sender, tokenId);
        (bool success, ) = lotOwner.call{value: msg.value}("");
        require(success, "Payment to buy lot failed");
    }

    /// @dev Rents a selected Lot to the caller
    /// @param _time is assumed to be in seconds, representing the number of days to rent
    function rentLot(uint256 tokenId, uint256 _time)
        external
        payable
        isBlacklisted
        isAvailable(tokenId)
        notLender(tokenId)
    {
        Lot storage currentLot = parkingLots[tokenId];
        require(currentLot.status == Listing.Rent, "Lot isn't up for rent");
        require(
            _time >= 1 days && _time <= 30 days,
            "Time needs to rent needs to be between 1 and 30 days"
        );
        // deposit is calculated bv the percentage set by lender multiplied by the total fee
        uint256 amount = getRentPrice(tokenId, _time, 1);
        require(msg.value == amount, "You need to pay to rent lot");
        currentLot.renter = payable(msg.sender);
        currentLot.rentTime = _time;
        currentLot.returnDay = block.timestamp + _time;
        currentLot.status = Listing.Rented;
        _transfer(currentLot.lender, msg.sender, tokenId);
        _approve(address(this), tokenId);
        (bool success, ) = currentLot.lender.call{value: msg.value}("");
        require(success, "Payment to rent lot failed");
    }

    /// @dev this is a helper function to help reset values and transfer lot back to lender
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

    /**
     * @dev this function is used by the lender in the situation
     *  that the renter hasn't return the lot after the deadline
     * @notice renter is backlisted from certain functionalities on the platform
     */
    function lenderEndRent(uint256 tokenId)
        external
        payable
        onlyLender(tokenId)
    {
        Lot storage currentLot = parkingLots[tokenId];
        require(
            block.timestamp >= currentLot.returnDay + additionalTime,
            "There is still time left for renter to return the lot!"
        );
        // renter is now blacklisted
        blacklisted[currentLot.renter] = true;
        endRentHelper(tokenId);
    }

    function getLot(uint256 tokenId) public view returns (Lot memory) {
        require(_exists(tokenId));
        return parkingLots[tokenId];
    }

    /// @dev returns the amount to pay to rent a lot or ending a rent
    /// @param tokenId is the ID of the lot
    /// @param _time is in seconds and represents the number of days for rent
    /// @param _status is the state of the lot
    /// @notice the cost is returned only for the deposit fee and the ending rent fee
    function getRentPrice(
        uint256 tokenId,
        uint256 _time,
        uint _status
    ) public view returns (uint256) {
        Lot storage currentLot = parkingLots[tokenId];
        uint price = currentLot.rentPrice / 100;
        if (_status == uint(Listing.Rented)) {
            return (100 - currentLot.deposit) * price * (_time / 1 days);
        } else if (_status == uint(Listing.Rent)) {
            return currentLot.deposit * price * (_time / 1 days);
        } else {
            return 0;
        }
    }

    function getParkingLotsLength() public view returns (uint256) {
        return totalParkings.current();
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
