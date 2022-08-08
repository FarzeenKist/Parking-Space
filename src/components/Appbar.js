import React, { useState } from "react";
import Navbar from "react-bootstrap/Navbar";
import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Wallet from "./Wallet";

import { uploadToIpfs } from "../utils/mint";

const Appbar = ({ address, destroy, balance, createLot, mintFee }) => {
	const [show, setShow] = useState(false);
	const [description, setDescription] = useState("");
	const [location, setLocation] = useState("");
	const [ipfsUrl, setIpfsUrl] = useState("");

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

	const handleAddParking = async () => {
		await createLot({ location, description, ipfsUrl });
		handleClose();
	};
	return (
		<>
			<Navbar collapseOnSelect bg="dark" variant="dark" expand="md">
				<Container>
					<Navbar.Brand href="#">Parking Space</Navbar.Brand>
					<Navbar.Toggle aria-controls="responsive-navbar-nav" />
					<Navbar.Collapse id="responsive-navbar-nav">
						<Nav className="me-auto">
							<Nav.Link className="active" href="#home">
								MarketPlace
							</Nav.Link>
							<Nav.Link variant="primary" onClick={handleShow}>
								Add Lot for {mintFee} CELO
							</Nav.Link>
						</Nav>
						<Wallet
							address={address}
							amount={balance.CELO}
							symbol="CELO"
							destroy={destroy}
						/>
					</Navbar.Collapse>
				</Container>
				<Modal show={show} onHide={handleClose}>
					<Modal.Header closeButton>
						<Modal.Title>Add Parking Lot</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<Form>
							<Form.Group className="mb-3" controlId="input-file">
								<Form.Label>Upload Image</Form.Label>
								<Form.Control
									type="file"
									onChange={async (e) => {
										const imageUrl = await uploadToIpfs(e);
										if (!imageUrl) {
											alert(
												"Failed to upload Image to IPFS"
											);
										}
										setIpfsUrl(imageUrl);
									}}
								/>
							</Form.Group>
							<Form.Group className="mb-3" controlId="location">
								<Form.Label>Location</Form.Label>
								<Form.Control
									type="text"
									placeholder="Enter location of parking"
									value={location}
									onChange={(e) => {
										setLocation(e.target.value);
									}}
								/>
							</Form.Group>
							<Form.Group
								className="mb-3"
								controlId="description"
							>
								<Form.Label>Description</Form.Label>
								<Form.Control
									type="text"
									placeholder="Enter a description of parking"
									value={description}
									onChange={(e) =>
										setDescription(e.target.value)
									}
								/>
							</Form.Group>
						</Form>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={handleClose}>
							Close
						</Button>
						<Button variant="primary" onClick={handleAddParking}>
							Add Parking Lot
						</Button>
					</Modal.Footer>
				</Modal>
			</Navbar>
		</>
	);
};

export default Appbar;
