import React, { useCallback, useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import { toast } from "react-toastify";
import Row from "react-bootstrap/Row";
import { useContractKit } from "@celo-tools/use-contractkit";
import {
	Notification,
	NotificationError,
	NotificationSuccess,
} from "./components/ui/Notifications";
import Cover from "./components/Cover";
import { useBalance, useMinterContract, useAdditionalTime } from "./hooks";
import "./App.css";
import Appbar from "./components/Appbar";
import Lot from "./components/Card";
import { createNft, getNfts } from "./utils/mint";
import {
	buyLot,
	clientEndRent,
	lenderEndRent,
	rentLot,
	setRent,
	setSale,
	setUnavailable,
} from "./utils/parking-space";
import image from "./background.jpg";

const App = function AppWrapper() {
	const { address, connect, performActions, destroy } = useContractKit();
	const { balance, getBalance } = useBalance();
	const minterContract = useMinterContract();
	const [nfts, setNfts] = useState([]);
	const { additionalTime } = useAdditionalTime();

	const createLot = async (data) => {
		try {
			const { location, description, ipfsUrl } = data;
			await createNft(
				minterContract,
				performActions,
				location,
				description,
				ipfsUrl
			);
			getLots();
			toast(
				<NotificationSuccess text="Successfully created the parking lot." />
			);
		} catch (e) {
			console.log(e);
			toast(<NotificationError text="Failed to create the parking lot." />);
		}
	};

	const getLots = useCallback(async () => {
		const res = await getNfts(minterContract);
		setNfts(res);
	}, [minterContract]);

	// changes status based off the value of newStatus
	// newDeposit is only taken into consideration when setting status to rent
	const handleChangeStatus = async (newStatus, newPrice, newDeposit, index) => {
		try {
			if (newStatus === "sale" && newPrice >= 1) {
				await setSale(minterContract, performActions, index, newPrice);
			} else if (
				newStatus === "rent" &&
				newPrice >= 1 &&
				newDeposit >= 0 &&
				newDeposit <= 100
			) {
				await setRent(
					minterContract, 
					performActions,
					index,
					newPrice,
					newDeposit
				);
			} else if (newStatus === "unavailable") {
				await setUnavailable(minterContract, performActions, index);
			}
			// triggered only if an unexpected value is assigned to newStatus
			else {
				alert("pick a valid status");
			}
			getLots();
			toast(
				<NotificationSuccess text="Successfully changed the status of the parking lot." />
			);
		} catch (e) {
			console.log(e);
			toast(
				<NotificationError text="Failed to change the status of the parking lot." />
			);
		}
	};

	const buyCurrentLot = async (index) => {
		try {
			await buyLot(minterContract, performActions, index, nfts[index].price);
			getLots();
			getBalance();
			toast(
				<NotificationSuccess text="Successfully bought the parking lot." />
			);
		} catch (e) {
			console.log(e);
			toast(<NotificationError text="Failed to buy the parking lot." />);
		}
	};

	const rentCurrentLot = async (index, time) => {
		try {
			// time is converted into seconds from number of days
			time = time * 24 * 3600;
			await rentLot(minterContract, performActions, index, time);
			getLots();
			getBalance();
			toast(
				<NotificationSuccess text="Successfully rented the parking lot." />
			);
		} catch (e) {
			console.log(e);
			toast(<NotificationError text="Failed to rent the parking lot." />);
		}
	};

	const endRentClient = async (index, time) => {
		try {
			await clientEndRent(minterContract, performActions, index, time);
			getLots();
			getBalance();
			toast(
				<NotificationSuccess text="Successfully ended rent for the parking lot." />
			);
		} catch (e) {
			console.log(e);
			toast(
				<NotificationError text="Failed to end rent for the parking lot." />
			);
		}
	};

	const endRentLender = async (index) => {
		try {
			await lenderEndRent(minterContract, performActions, index);
			getLots();
			toast(
				<NotificationSuccess text="Successfully ended rent for the parking lot." />
			);
		} catch (e) {
			console.log(e);
			toast(
				<NotificationError text="Failed to end rent for the parking lot." />
			);
		}
	};

	useEffect(() => {
		try {
			if (minterContract && address) {
				getLots();
			}
		} catch (e) {
			console.log(e);
		}
	}, [minterContract, address, getLots]);
	return (
		// display cover if user is not connected
		<div className="App">
			<Notification />
			{address ? (
				<>
					<Appbar
						address={address}
						destroy={destroy}
						balance={balance}
						createLot={createLot}
					/>
					<Container fluid="md">
						<Row xs={1} sm={2} lg={3}>
							{nfts.map((nft) => (
								<Lot
									key={nft.index}
									nft={nft}
									minterContract={minterContract}
									additionalTime={additionalTime}
									performActions={performActions}
									handleChangeStatus={handleChangeStatus}
									buyCurrentLot={buyCurrentLot}
									rentCurrentLot={rentCurrentLot}
									endRentClient={endRentClient}
									endRentLender={endRentLender}
								/>
							))}
						</Row>
					</Container>
				</>
			) : (
				<header
					className="App-header"
					style={{
						backgroundImage: `url(${image})`,
						backgroundRepeat: "no-repeat",
						backgroundSize: "cover",
					}}
				>
					<Cover connect={connect} />
				</header>
			)}
		</div>
	);
};

export default App;
