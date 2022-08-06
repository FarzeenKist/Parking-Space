import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Stack from "react-bootstrap/Stack";
import { ethers } from "ethers";
const ChangeStatusModal = ({
	index,
	currentStatus,
	handleChangeStatus
}) => {
	const [showStatusModal, setShowStatusModal] = useState(false);

	const handleCloseStatus = () => setShowStatusModal(false);
	const handleShowStatus = () => setShowStatusModal(true);
	const [newStatus, setNewStatus] = useState(0);
	const [newPrice, setNewPrice] = useState(0);
	const [newDeposit, setNewDeposit] = useState(0);
	return (
		<>
			<Stack>
				<Button variant="danger" onClick={handleShowStatus}>
					Change Status
				</Button>
			</Stack>
			<Modal
				show={showStatusModal}
				onHide={handleCloseStatus}
				backdrop="static"
				keyboard={false}
			>
				<Modal.Header closeButton>
					<Modal.Title>Change status of Lot</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<Form.Group controlId="newPrice" className="mt-2">
							<Form.Label>Enter new price</Form.Label>
							<Form.Control
								aria-label="rent input"
								min="1"
								value={newPrice}
								onChange={(e) =>
									setNewPrice(e.target.value)
								}
							/>
						</Form.Group>
						<Form.Group controlId="newDeposit" className="mt-2">
							<Form.Label>Enter new deposit amount</Form.Label>
							<Form.Control
								type="number"
								aria-label="rent input"
								value={newDeposit}
								onChange={(e) => setNewDeposit(e.target.value)}
							/>
						</Form.Group>
						<Form.Group className="mt-2" controlId="status">
							<Form.Label>Switch status</Form.Label>
							<Form.Select
								aria-label="change status"
								name="status"
								className="mb-1"
								value={newStatus}
								onChange={(e) => {
									setNewStatus(e.target.value);
								}}
							>
								<option>Status</option>
								{currentStatus === 0 ? (
									<option value="sale" disabled>
										Sale
									</option>
								) : (
									<option value="sale">Sale</option>
								)}
								{currentStatus === 1 ? (
									<option value="rent" disabled>
										Rent
									</option>
								) : (
									<option value="rent">Rent</option>
								)}
								{currentStatus === 2 ? (
									<option value="unavailable" disabled>
										Unavailable
									</option>
								) : (
									<option value="unavailable">Unavailable</option>
								)}
							</Form.Select>
						</Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={handleCloseStatus}>
						Close
					</Button>
					<Button variant="primary" onClick={async() => {
						ethers.utils.parseUnits(`${newPrice}`);
						await handleChangeStatus(newStatus, newPrice, newDeposit, index);
						handleCloseStatus();
						}}>
						Confirm new Status
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};

export default ChangeStatusModal;
