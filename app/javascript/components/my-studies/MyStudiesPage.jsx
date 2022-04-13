
import React, { useEffect, useState } from 'react'
import { useTable, usePagination, useSortBy, useFilters } from 'react-table'

import UserProvider from '~/providers/UserProvider'
import LoadingSpinner from '~/lib/LoadingSpinner'
import { fetchEditableStudies } from '~/lib/scp-api'
import PagingControl from '~/components/search/results/PagingControl'
import ErrorBoundary from '~/lib/ErrorBoundary'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSort, faSortDown, faSortUp, faEllipsisV, faChartLine } from '@fortawesome/free-solid-svg-icons'
import InfoPopup from '~/lib/InfoPopup'
import StudyUsageInfo from './StudyUsageInfo'
import { nodeName } from 'jquery'

// define these outside the render loop so they don't cause rerender loops
// if they ever need to be dynamic, make sure to use useMemo
const columns = [{
  Header: 'Title ',
  accessor: 'name',
  Cell: ({ value, row: { original: { accession, description } } }) => {
    let shortDesc = description.substring(0, 100)
    if (description.length > 100) {
      shortDesc += '...'
    }
    return <div>
      <a href={`/single_cell/study/${accession}`}>{value}</a><br/>
      <span className="detail">{shortDesc}</span>

    </div>
  },
  sortType: (rowA, rowB) => {
    return rowA.original.name.localeCompare(rowB.original.name, 'en', { numeric: true, ignorePunctuation: true })
  },
  filter: (rows, id, filterValue) => {
    const lowerCaseFilter = filterValue.toLowerCase()
    return rows.filter(row => (
      row.original.name.toLowerCase().includes(lowerCaseFilter) ||
      row.original.description.toLowerCase().includes(lowerCaseFilter)
    ))
  },
  Filter: ({ column: { filterValue, setFilter } }) => {
    return <>
      &nbsp; &nbsp;
      <input value={filterValue || ''} style={{ minWidth: '300px', border: 'none', margin: '4px' }}
        onChange={e => setFilter(e.target.value || undefined)}
        placeholder="Filter by name or description"
      />
    </>
  }
}, {
  Header: 'Created',
  accessor: 'createdAt',
  Cell: ({ value }) => {
    const date = new Date(value)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  },
  sortType: (rowA, rowB) => {
    return new Date(rowA.original.createdAt) - new Date(rowB.original.createdAt)
  },
  disableFilters: true
}, {
  Header: 'Visibility',
  accessor: 'public',
  Cell: ({ value }) => <span className={value ? 'public' : 'detail'}>{value ? 'Public' : 'Private'}</span>,
  sortType: (rowA, rowB) => {
    return rowA.original.public - rowB.original.public
  },
  disableFilters: true
}, {
  Header: 'Visuals',
  accessor: 'initialized',
  Cell: ({ value }) => <span className={value ? 'initialized' : 'detail'}>{value ? 'Yes' : 'No'}</span>,
  sortType: (rowA, rowB) => {
    return rowA.original.initialized - rowB.original.initialized
  },
  disableFilters: true
}, {
  Header: 'Usage',
  Cell: ({ row: { original: study } }) => (
    <a href={`/single_cell/studies/${study.id.$oid}/usage_stats`}>
      <FontAwesomeIcon icon={faChartLine}/>
    </a>
  ),
  disableSortBy: true,
  disableFilters: true
}, {
  Header: '',
  accessor: 'accession',
  Cell: ({ row: { original: study } }) => {
    const target = <div data-analytics-name='study-actions-expand'
      tabIndex="0"
      role="button"
      aria-label={`Menu for study: ${study.name}`}
      aria-haspopup="menu"
      className="action">
      <FontAwesomeIcon icon={faEllipsisV}/>
    </div>

    const content = <div>
      <a href={`/single_cell/studies/${study.id.$oid}`}>Details</a><br/>
      <a href={`/single_cell/studies/${study.id.$oid}/upload`}>Upload/Edit</a><br/>
      <a href={`/single_cell/studies/${study.id.$oid}/sync`}>Sync</a><br/>
      <a href={`/single_cell/studies/${study.id.$oid}/edit`}>Edit</a><br/>
      <a data-method="delete" href={`/single_cell/studies/${study.id.$oid}`}>Delete Study & Workspace</a><br/>
      <a data-method="delete" href={`/single_cell/studies/${study.id.$oid}?workspace=persist`}>Delete</a><br/>
    </div>
    return <InfoPopup
      target={target}
      content={content}
      placement="left"
    />
  },
  disableSortBy: true,
  disableFilters: true
}]

/** Include Reach router */
export default function MyStudiesPage() {
  const [studyList, setStudyList] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const data = React.useMemo(
    () => studyList,
    [studyList]
  )

  const {
    getTableProps,
    getTableBodyProps,
    prepareRow,
    headers,
    page,
    gotoPage,
    canPreviousPage,
    canNextPage,
    state: { pageIndex }
  } = useTable({
    columns,
    data,
    // holds pagination states
    initialState: {
      pageIndex: 0,
      pageSize: 10,
      sortBy: [{
        id: 'createdAt',
        desc: true
      }]
    }
  },
  useFilters, useSortBy, usePagination)
  useEffect(() => {
    fetchEditableStudies().then(response => {
      setStudyList(response)
      setIsLoading(false)
    })
  }, [])

  let pageControlDisplay = <></>
  if (studyList.length > 10) {
    pageControlDisplay = <PagingControl currentPage={pageIndex}
      totalPages={Math.round(studyList.length / 10) + 1}
      changePage={gotoPage}
      canPreviousPage={canPreviousPage}
      canNextPage={canNextPage}
      zeroIndexed={true}/>
  }


  return (<UserProvider>
    <div className="form-terra">
      <h4>Studies</h4>
      <br/>
      <LoadingSpinner isLoading={isLoading}>
        <table {...getTableProps({ className: 'table-terra min-width-100' })}>
          <thead>
            <tr>
              {headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  {!column.disableSortBy && <span>
                    {column.isSorted ? column.isSortedDesc ? <FontAwesomeIcon icon={faSortDown}/> : <FontAwesomeIcon icon={faSortUp}/> : <FontAwesomeIcon icon={faSort}/>}
                  </span> }
                  {column.canFilter && column.render('Filter')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.map((row, i) => {
              prepareRow(row)
              return (
                <tr key={i}>
                  <ErrorBoundary>
                    {row.cells.map((cell, i) => (
                      <td key={i} {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </td>
                    ))}
                  </ErrorBoundary>
                </tr>
              )
            })}
          </tbody>
        </table>
        { pageControlDisplay }
      </LoadingSpinner>
    </div>
  </UserProvider>)
}
