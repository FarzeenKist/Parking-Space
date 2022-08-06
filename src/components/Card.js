import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import { truncateAddress, formatBigNumber } from "../utils";
import Identicon from "./ui/Identicon";
import { useContractKit } from "@celo-tools/use-contractkit";
import ChangeStatusModal from "./ChangeStatusModal";
import RentModal from "./RentModal";
const Lot = ({
	nft,
	additionalTime,
	handleChangeStatus,
	buyCurrentLot,
	rentCurrentLot,
	endRentClient,
	endRentLender,
}) => {
	const {
		index,
		lender,
		renter,
		price,
		rentPrice,
		deposit,
		returnDay,
		rentTime,
		status,
		location,
		image,
		description,
	} = nft;
	const d = new Date();
	const { address } = useContractKit();

	return (
		<Col style={{marginTop: "2rem", marginBottom: "1rem"}}>
			<Card className="h-100" style={{ width: "18rem" }}>
				<Card.Img variant="top" src={image} />
				<Card.Header>
					<Stack direction="horizontal" gap={2}>
						<Identicon address={lender} size={28} />
						<span className="font-monospace text-secondary">
							{truncateAddress(lender)}
						</span>
						<Badge
							bg={status === 2 || status === 3 ? "danger" : "success"}
							className="ms-auto"
						>
							{status === 2 || status === 3 ? "Unavailable" : "Available"}
						</Badge>
					</Stack>
				</Card.Header>
				<Card.Body>
					<Card.Title>{location}</Card.Title>
					<Card.Text>{description}</Card.Text>
				</Card.Body>
				<Card.Body>
					{address === lender && status !== 3 ? (
						<>
							<ChangeStatusModal
								handleChangeStatus={handleChangeStatus}
								currentStatus={status}
								index={index}
							/>
						</>
					) : (
						""
					)}
					{address !== lender && status === 1 ? (
						<RentModal
							index={index}
							rentPrice={rentPrice}
							deposit={deposit}
							rentCurrentLot={rentCurrentLot}
						/>
					) : (
						""
					)}
					{address !== lender && status === 0 ? (
						<Stack>
							<Button
								size="lg"
								variant="outline-success"
								onClick={() => buyCurrentLot(index)}
							>
								Buy Lot for {formatBigNumber(price)} CELO
							</Button>
						</Stack>
					) : (
						""
					)}

					{status === 3 && additionalTime + returnDay > d.getTime() / 1000 ? (
						<Card.Text>
							Lot has been rented by {truncateAddress(renter)} for{" "}
							{rentTime / (3600 * 24)} days
						</Card.Text>
					) : (
						""
					)}
					{address === renter && status === 3 ? (
						<Button
							size="sm"
							variant="outline-danger"
							onClick={async() => await endRentClient(index, rentTime)}
						>
							End Rent
						</Button>
					) : (
						""
					)}
					{address === lender &&
					status === 3 &&
					additionalTime + returnDay > d.getTime() / 1000 ? (
						<Button
							size="sm"
							variant="outline-info"
							onClick={() => endRentLender(index)}
						>
							Retrieve Lot
						</Button>
					) : (
						""
					)}
				</Card.Body>
			</Card>
		</Col>
	);
};

export default Lot;