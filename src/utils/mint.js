import { create as ipfsHttpClient } from "ipfs-http-client";
import axios from "axios";
import BigNumber from "bignumber.js";
import { createLot } from "./parking-space";
// initialize IPFS

const auth =
    "Basic " +
    Buffer.from(
        process.env.REACT_APP_PROJECT_ID +
            ":" +
            process.env.REACT_APP_PROJECT_SECRET
    ).toString("base64");

const client = ipfsHttpClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  apiPath: '/api/v0',
  headers: {
    authorization: auth,
  }
})
// mint an NFT
export const createNft = async (
	minterContract,
	performActions,
	location,
	description,
	ipfsImage
) => {
	await performActions(async (kit) => {
		if (!location || !description || !ipfsImage) return;
		const { defaultAccount } = kit;

		// convert NFT metadata to JSON format
		const data = JSON.stringify({
			location,
			description,
			image: ipfsImage,
			owner: defaultAccount,
		});

		try {
			// save NFT metadata to IPFS
			const added = await client.add(data);

			// IPFS url for uploaded metadata
			const url = `https://parkingspace.infura-ipfs.io/ipfs/${added.path}`;
	
			// mint the NFT and save the IPFS url to the blockchain
			let transaction = await createLot(
				minterContract,
				performActions,
				url
			);
			return transaction;
		} catch (error) {
			console.log("Error uploading file: ", error);
		}
	});
};

// function to upload a file to IPFS
export const uploadToIpfs = async (e) => {
	const file = e.target.files[0];
	if (!file) return;
	try {
		const added = await client.add(file);
		return `https://parkingspace.infura-ipfs.io/ipfs/${added.path}`;
	} catch (error) {
		console.log("Error uploading file: ", error);
	}
};

// fetch all NFTs on the smart contract
export const getNfts = async (minterContract) => {
	try {
		const nfts = [];
		const nftsLength = await minterContract.methods
			.getParkingLotsLength()
			.call();
		for (let i = 0; i < Number(nftsLength); i++) {
			const nft = new Promise(async (resolve) => {
				const res = await minterContract.methods.tokenURI(i).call();
				const meta = await fetchNftMeta(res);
				console.log(meta)
				const lot = await fetchLot(minterContract, i);
				resolve({
					index: i,
					lender: lot[0],
					renter: lot[1],
					price: new BigNumber(lot[2]),
					rentPrice: new BigNumber(lot[3]),
					deposit: lot[4],
					returnDay: lot[5],
					rentTime: lot[6],
					status: Number(lot[7]),
					location: meta.data.location,
					image: meta.data.image,
					description: meta.data.description,
				});
			});
			nfts.push(nft);
		}
		return Promise.all(nfts);
	} catch (e) {
		console.log({ e });
	}
};

// get the metedata for an NFT from IPFS
export const fetchNftMeta = async (ipfsUrl) => {
	try {
		if (!ipfsUrl) return null;
		const meta = await axios.get(ipfsUrl);
		return meta;
	} catch (e) {
		console.log({ e });
	}
};

// get the owner address of an NFT
export const fetchLot = async (minterContract, index) => {
	try {
		return await minterContract.methods.getLot(index).call();
	} catch (e) {
		console.log({ e });
	}
};

// get the address that deployed the NFT contract
export const fetchNftContractOwner = async (minterContract) => {
	try {
		let owner = await minterContract.methods.owner().call();
		return owner;
	} catch (e) {
		console.log({ e });
	}
};
