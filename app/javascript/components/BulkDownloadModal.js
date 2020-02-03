import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function BulkDownloadModel(props) {
  const [show, setShow] = useState(true);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return(
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Bulk Download</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p class="lead">To download all files using <code>curl</code>, click the button below to get the download command:</p>
        <p class="lead command-container" id="command-container-all">
          <Button
            className='fas fa-download'
            id='get-download-command_all'
          />
        </p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
        <Button variant="primary" onClick={handleClose}>Save changes</Button>
      </Modal.Footer>
    </Modal>
  );
}
