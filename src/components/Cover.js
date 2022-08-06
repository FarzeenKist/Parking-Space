import Button from "react-bootstrap/Button";
const Cover = ({ connect }) => {
	const connectWallet = async () => {
		try {
			await connect();
		} catch (e) {
			console.log({ e });
		}
	};
	return (
		<>
			<p className="color-dark">Welcome to Parking Space. A marketplace where you can sell or rent parking spots.</p>
			<Button variant="dark" onClick={connectWallet}>
				Connect Wallet
			</Button>
		</>
	);
};

export default Cover;
