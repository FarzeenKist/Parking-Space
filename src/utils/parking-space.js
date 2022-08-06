import BigNumber from "bignumber.js";
import { ethers } from "ethers";
export const createLot = async (minterContract, performActions, uri) => {
	try {
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			const fee = await minterContract.methods.getMintFee().call();

			await minterContract.methods
				.createLot(uri)
				.send({ from: defaultAccount, value: fee });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const setUnavailable = async (minterContract, performActions, index) => {
	try {
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			await minterContract.methods
				.setUnavailable(index)
				.send({ from: defaultAccount });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const setSale = async (minterContract, performActions, index, price) => {
	try {
		price = ethers.utils.parseUnits(`${price}`);
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			await minterContract.methods
				.setSale(index, price)
				.send({ from: defaultAccount });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const setRent = async (
	minterContract,
	performActions,
	index,
	price,
	deposit
) => {
	try {
		price = ethers.utils.parseUnits(`${price}`);
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			await minterContract.methods
				.setRent(index, price, deposit)
				.send({ from: defaultAccount });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const buyLot = async (minterContract, performActions, index, price) => {
	try {
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			await minterContract.methods
				.buyLot(index)
				.send({ from: defaultAccount, value: price });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const rentLot = async (minterContract, performActions, index, time) => {
	try {
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			const status = 1;
			const rentPrice = new BigNumber(
				await minterContract.methods.getRentPrice(index, time, status).call()
			);
			await minterContract.methods
				.rentLot(index, time)
				.send({ from: defaultAccount, value: rentPrice });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const clientEndRent = async (
	minterContract,
	performActions,
	index,
	time
) => {
	try {
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			const status = 3;
			const rentPrice = new BigNumber(
				await minterContract.methods.getRentPrice(index, time, status).call()
			);
			await minterContract.methods
				.clientEndRent(index)
				.send({ from: defaultAccount, value: rentPrice });
		});
	} catch (error) {
		console.error({ error });
	}
};

export const lenderEndRent = async (minterContract, performActions, index) => {
	try {
		await performActions(async (kit) => {
			const { defaultAccount } = kit;
			await minterContract.methods
				.lenderEndRent(index)
				.send({ from: defaultAccount });
		});
	} catch (error) {
		console.error({ error });
	}
};
