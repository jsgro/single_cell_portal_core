import React from 'react';
import FilterSlider from './FilterSlider';

/**
 * Component for a list of string-based filters, e.g. disease, species
 */
function FilterList(props) {
  return (
    <ul>
    {
      props.filters.map((filter) => {
        return (
          <li key={'li-' + filter.id}>
            <input
              type='checkbox'
              aria-label='checkbox'
              onChange={(e) => {props.onChange(filter.id, e.target.checked)}}
              id={filter.id}
              name={filter.id}
              checked={props.selection.includes(filter.id)}
            />
            <label htmlFor={filter.id}>{filter.name}</label>
          </li>
        );
      })
    }
    </ul>
  );
}

/**
 * Component for filter list and filter slider
 */
export default function Filters(props) {
  const filters = props.filters;
  if (props.facet.type !== 'number') {
    return <FilterList filters={filters} onChange={props.onFilterValueChange} selection={props.selection} />;
  } else {
    return <FilterSlider facet={props.facet} onSelectFilter={props.onSelectFilter} />;
  }
}
