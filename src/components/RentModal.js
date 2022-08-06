import { useState } from "react";
import Form from "react-bootstrap/Form";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { formatBigNumber } from "../utils";
const RentModal = ({ index, rentPrice, deposit, rentCurrentLot }) => {
	const [show, setShow] = useState(false);
	const handleCloseRent = () => setShow(false);
	const handleShowRent = () => setShow(true);
	const [rentTill, setRentTill] = useState(1);
	return (
		<Form>
			<Form.Group className="mb-3" controlId={`date-${index}`}>
				<Form.Label>Number of Days to rent</Form.Label>
				<Stack direction="vertical" gap={3}>
					<Form.Control
						type="number"
						style={{ padding: "0.15rem" }}
						value={rentTill}
						min="1"
						max="30"
						onChange={(e) => setRentTill(e.target.value)}
					/>

					<Button
						size="sm"
						variant="outline-dark"
						onClick={() => {
							handleShowRent();
						}}
					>
						Rent for {formatBigNumber(rentPrice)} CELO/Day at {deposit}% deposit
					</Button>
				</Stack>
			</Form.Group>
			<Modal
				show={show}
				onHide={handleCloseRent}
				backdrop="static"
				keyboard={false}
			>
				<Modal.Header closeButton>
					<Modal.Title>Rent</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					Rent for duration of {rentTill} days will require a deposit of{" "}
					{formatBigNumber(rentPrice) * rentTill * (deposit / 100)} CELO. The Total cost is {formatBigNumber(rentPrice) * rentTill} CELO
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={handleCloseRent}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={() => rentCurrentLot(index, rentTill)}
					>
						Accept
					</Button>
				</Modal.Footer>
			</Modal>
		</Form>
	);
};

export default RentModal;
