import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-bootstrap/lib/Modal';
import Button from 'react-bootstrap/lib/Button';

// TODO: Remove this once API endpoint is integrated
import {authCodeResponseMock} from './FacetsMockData';

function fetchDownloadConfig() {
  // TODO: Move this documentation to a more summary location, but still within the code.
  //
  // Example search query:
  //
  // terms=copy%20number&facets=species:NCBITaxon_9606+disease:MONDO_0018177,MONDO_0005089
  //
  // Human-readable interpretation:
  //
  // Search for SCP studies that have:
  //    terms=copy%20number                  A title or description containing the terms "copy" OR "number"
  //    &facets=                              AND cells that have been annotated using the SCP metadata convention to be 
  //      species:NCBITaxon_9606                from human
  //      +                                     AND
  //      disease:MONDO_0018177,MONDO_0005089   having glioblastoma OR sarcoma
  //

  const searchQuery = '&file_types=metadata,expression&accessions=SCP1,SCP2';
  const authCode = authCodeResponseMock.auth_code; // Auth code is a one-time authorization token (OTAC)

  const timeInterval = authCodeResponseMock.time_interval;

  // Gets a curl configuration ("cfg.txt") containing signed
  // URLs and output names for all files in the download object.
  const url = (
    window.origin +
    '/api/v1/bulk_download?auth_code=' +
    authCode +
    searchQuery
  );
  const flag = (window.location.host === 'localhost') ? 'k' : ''; // "-k" === "--insecure"
  
  // This is what the user will run in their terminal to download the data.
  const downloadCommand = (
    'curl "' + url + '" -' + flag + 'o cfg.txt; ' +
    'curl -K cfg.txt'
  );

  return [authCode, timeInterval, downloadCommand];
}

function DownloadCommandContainer() {
  
  const [authCode, timeInterval, downloadCommand] = fetchDownloadConfig();

  const expiresMinutes = Math.floor(timeInterval / 60); // seconds -> minutes

  const commandID = 'command-' + authCode;

  return (
    <div>
      <div class="input-group">
        <input
          id={commandID}
          class="form-control curl-download-command"
          value={downloadCommand}
          readOnly
        />
        <span class="input-group-btn"> +
          <button 
            id={'copy-button-' + authCode}
            class="btn btn-default btn-copy" 
            data-clipboard-target={'#' + commandID}
            data-toggle="tooltip"
            title="Copy to clipboard">
            <i class="far fa-copy"></i>
          </button>
          <button 
            id={'refresh-button-' + authCode}
            class="btn btn-default btn-refresh glyphicon glyphicon-refresh"
            data-toggle="tooltip"
            title="Refresh download command">
          </button>
        </span>
        </div>
      <div style={{fontSize: '12px'}}>
        Valid for one use within {' '}
        <span class="countdown" id={'countdown-' + authCode}>
          {expiresMinutes}
        </span>{' '}
        minutes.  If your command has expired, click refresh button at right in this box.
      </div>
    </div>
  );
}


/**
 * Component for "Download" button and Bulk Download modal.
 *
 * UI spec: https://projects.invisionapp.com/d/main#/console/19272801/402387755/preview
 */
export default function DownloadButton(props) {

  const [show, setShow] = useState(false);
  const [showDownloadCommand, setShowDownloadCommand] = useState(false);

  function showModalAndFetchDownloadCommand() {
    setShow(!show);
  }

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // Enables copying to clipboard upon clicking a "clipboard" icon,
  // like on GitHub.  https://clipboardjs.com.
  var clipboard = new Clipboard('.btn-copy');
  clipboard.on('success', function(event) {
    $('#' + event.trigger.id)
      .attr('title', 'Copied!')
      .tooltip('fixTitle')
      .tooltip('show');
  });

  $('body').on('click', '.btn-refresh', function(event) {
    var commandContainer = $(this).parentsUntil('.command-container').parent();
    var downloadObject = commandContainer.attr('id').split('-').slice(-1)[0];
    writeDownloadCommand(downloadObject);
  });

  return (
      <>
      <span
        id='download-button'
        className={`${show ? 'active' : ''}`}>
        <span
          onClick={showModalAndFetchDownloadCommand}>
          <FontAwesomeIcon className="icon-left" icon={faDownload}/>
          Download
        </span>
      </span>
      <Modal
        id='bulk-download-modal'
        show={show}
        onHide={handleClose}
        animation='false'
        bsSize='large'
      >
        <Modal.Header closeButton>
          <Modal.Title><h2 class='text-center'>Bulk Download</h2></Modal.Title>
        </Modal.Header>
  
        <Modal.Body>
          <p className='lead'>
          To download files matching your search, copy this command and paste it into your terminal:
          </p>
          <p className='lead command-container' id='command-container-all'>
            {/* <Button
              bsStyle='primary'
              id='get-download-command_all'
              onClick={createDownloadCommand}
            >
              <FontAwesomeIcon className="icon-left" icon={faDownload}/>
              Get download command for study files matching your search
            </Button> */}
            <DownloadCommandContainer />
          </p>
        </Modal.Body>

      </Modal>
      </>
    );
}
