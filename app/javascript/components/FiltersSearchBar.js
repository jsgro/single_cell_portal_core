import React, { useState } from 'react';
import Form from 'react-bootstrap/lib/Form';
import FormControl from 'react-bootstrap/lib/FormControl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/lib/Button';

import { fetchFacetsFilters } from 'lib/scp-api';

/**
 * Component to search filters within a given facet
 * Used when facet has many available filters (e.g. disease)
 *
 * Stub, will develop.
 */
export default function FiltersSearchBar(props) {

  const componentName = 'filters-search-bar';
  const filtersSearchBarId = `${componentName}-${props.filtersBoxId}`;

  function handleSubmit() {

  }

  return (
    <div class="filters-search-bar">
      <Form onSubmit={handleSubmit}>
        <FormControl
          id={filtersSearchBarId}
          type="text"
          autoComplete='false'
          placeholder="Search"
        />
        <Button className='search-button' onClick={props.handleSearchButtonClick}>
          <FontAwesomeIcon icon={faSearch}/>
        </Button>
      </Form>
    </div>
  );
}
