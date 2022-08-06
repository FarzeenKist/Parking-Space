const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Parking Space Test", function () {
	this.timeout(50000);

	let ps;
	let owner;
	let acc1;
	let acc2;
	const tokenId = 0;
	const deposit = 10;
	const price = ethers.utils.parseUnits("1");

	const createLot = async (_ps, _acc) => {
		const baseURI = "https://example.com/";
		const mintFee = ethers.utils.parseEther("1");
		const tx = await ps.connect(_acc).createLot(baseURI, { value: mintFee });
		await tx.wait();
		return tx;
	};

	this.beforeEach(async function () {
		// This is executed before each test
		// Deploying the smart contract
		const PS = await ethers.getContractFactory("ParkingSpace");
		[owner, acc1, acc2] = await ethers.getSigners();

		ps = await PS.deploy();
	});

	it("Should set the right owner", async function () {
		expect(await ps.owner()).to.equal(owner.address);
	});

	it("Should mint one NFT", async function () {
		expect(await ps.balanceOf(acc1.address)).to.equal(0);

		const tx = await createLot(ps, acc1);
		await tx.wait();
		expect(await ps.balanceOf(acc1.address)).to.equal(1);
	});

	it("should toggle to sale, rent and back to unavailable", async function () {
		expect(await ps.balanceOf(acc1.address)).to.equal(0);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		const tx = await createLot(ps, acc1);
		await tx.wait();
		expect(await ps.balanceOf(acc1.address)).to.equal(1);
		let obj = await ps.getLot(0);

		// Listing.unavailable has index of 2 in Enum Listing
		// Lots are initialised as unavailable when minting
		expect(obj[7]).to.equal(2);
		// The option to change to Listing.Sale is zero, tokenId is also zero
		const txToSale = await ps.connect(acc1).setSale(tokenId, price);
		await txToSale.wait();
		obj = await ps.getLot(0);
		expect(obj[7]).to.equal(0);
		expect(obj[2]).to.equal(price);
		expect(await ps.balanceOf(ps.address)).to.equal(1);

		// Listing.Rent has index of 1 in Enum Listing
		// Changes from Listing.Sale to Listing.Rent
		const txToRent = await ps.connect(acc1).setRent(tokenId, price, deposit);
		await txToRent.wait();
		obj = await ps.getLot(0);
		expect(obj[7]).to.equal(1);
		expect(obj[3]).to.equal(price);
		expect(obj[4]).to.equal(deposit);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		expect(await ps.balanceOf(acc1.address)).to.equal(1);

		// Listing.Unavailable has the index of 3 in Enum Listing
		// Note: Number 2 is passed as param for option to change Lot.status to Listing.Unavailable
		const txToUnavailable = await ps.connect(acc1).setUnavailable(tokenId);
		await txToUnavailable.wait();
		obj = await ps.getLot(tokenId);
		expect(obj[7]).to.equal(2);
		expect(obj[2]).to.equal(0);
		expect(obj[3]).to.equal(0);
		expect(obj[4]).to.equal(0);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		expect(await ps.balanceOf(acc1.address)).to.equal(1);
	});

	it("should toggle to sale, set selling price and successfully be sold", async function () {
		expect(await ps.balanceOf(acc1.address)).to.equal(0);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		const tx = await createLot(ps, acc1);
		await tx.wait();
		expect(await ps.balanceOf(acc1.address)).to.equal(1);
		let obj = await ps.getLot(0);

		// Listing.unavailable has index of 2 in Enum Listing
		// Lots are initialised as unavailable when minting
		expect(obj[7]).to.equal(2);
		const txToSale = await ps.connect(acc1).setSale(tokenId, price);
		await txToSale.wait();
		obj = await ps.getLot(0);
		expect(obj[7]).to.equal(0);
		expect(obj[2]).to.equal(price);
		expect(await ps.balanceOf(ps.address)).to.equal(1);
		expect(await ps.balanceOf(acc2.address)).to.equal(0);

		const txBuy = await ps
			.connect(acc2)
			.buyLot(0, { value: ethers.utils.parseEther("1") });
		await txBuy.wait();
		expect(await ps.balanceOf(acc2.address)).to.equal(1);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
	});

	it("should set status to rent, set rent price, successfully rent and client to end rent", async function () {
		expect(await ps.balanceOf(acc1.address)).to.equal(0);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		const tx = await createLot(ps, acc1);
		await tx.wait();
		expect(await ps.balanceOf(acc1.address)).to.equal(1);
		let obj = await ps.getLot(0);

		// Listing.unavailable has index of 2 in Enum Listing
		// Lots are initialised as unavailable when minting
		expect(obj[7]).to.equal(2);

		// Listing.Rent has index of 1 in Enum Listing
		// Changes from Listing.Sale to Listing.Rent
		const txToRent = await ps.connect(acc1).setRent(tokenId, price, deposit);
		await txToRent.wait();
		obj = await ps.getLot(0);
		expect(obj[7]).to.equal(1);
		expect(obj[3]).to.equal(price);
		expect(obj[4]).to.equal(deposit);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		expect(await ps.balanceOf(acc1.address)).to.equal(1);

		const rentFees = ethers.utils.formatEther(
			await ps.getRentPrice(0, 86400, 1)
		);

		const txRentLot = await ps
			.connect(acc2)
			.rentLot(0, 86400, { value: ethers.utils.parseEther(`${rentFees}`) });
		await txRentLot.wait();
		obj = await ps.getLot(0);
		expect(obj[1]).to.equal(acc2.address);
		expect(obj[7]).to.equal(3);

		const newFees = ethers.utils.formatEther(await ps.getRentPrice(0, 2, 3));
		const txEndRent = await ps
			.connect(acc2)
			.clientEndRent(0, { value: ethers.utils.parseEther(`${newFees}`) });
		await txEndRent.wait();
		obj = await ps.getLot(0);
		expect(await ps.ownerOf(tokenId)).to.equal(acc1.address);
		expect(obj[7]).to.equal(1);
	});

	// this will intentionally fail due to lender only being able to end rent after the time has passed
	it("should rent and owner should be able to get lot back", async function () {
		expect(await ps.balanceOf(acc1.address)).to.equal(0);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		const tx = await createLot(ps, acc1);
		await tx.wait();
		expect(await ps.balanceOf(acc1.address)).to.equal(1);
		let obj = await ps.getLot(0);

		// Listing.unavailable has index of 2 in Enum Listing
		// Lots are initialised as unavailable when minting
		expect(obj[7]).to.equal(2);

		// Listing.Rent has index of 1 in Enum Listing
		// Changes from Listing.Sale to Listing.Rent
		const txToRent = await ps.connect(acc1).setRent(tokenId, price, deposit);
		await txToRent.wait();
		obj = await ps.getLot(0);
		expect(obj[7]).to.equal(1);
		expect(obj[3]).to.equal(price);
		expect(obj[4]).to.equal(deposit);
		expect(await ps.balanceOf(ps.address)).to.equal(0);
		expect(await ps.balanceOf(acc1.address)).to.equal(1);

		const rentFees = ethers.utils.formatEther(
			await ps.getRentPrice(0, 86400, 1)
		);

		const txRentLot = await ps.connect(acc2).rentLot(tokenId, 86400, {
			value: ethers.utils.parseEther(`${rentFees}`),
		});
		await txRentLot.wait();
		obj = await ps.getLot(tokenId);
		expect(obj[1]).to.equal(acc2.address);
		expect(obj[7]).to.equal(3);

		const txEndRent = await ps.connect(acc1).lenderEndRent(tokenId);
		await txEndRent.wait();
		obj = await ps.getLot(tokenId);
		expect(obj[1]).to.equal(acc1.address);
		expect(await ps.ownerOf(tokenId)).to.equal(acc1.address);
		expect(obj[7]).to.equal(1);
	});
});
