
import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faDownload, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import Button from 'react-bootstrap/lib/Button'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import DifferentialExpressionModal from '~/components/explore/DifferentialExpressionModal'
import DifferentialExpressionGroupPicker from '~/components/visualization/controls/DifferentialExpressionGroupPicker'

import {
  logDifferentialExpressionTableSearch,
  logSearchFromDifferentialExpression
} from '~/lib/search-metrics'
import { downloadBucketFile } from '~/lib/scp-api'


/** Return selected annotation object, including its `values` a.k.a. groups */
function getAnnotationObject(exploreParamsWithDefaults, exploreInfo) {
  const selectedAnnotation = exploreParamsWithDefaults?.annotation
  return exploreInfo.annotationList.annotations.find(thisAnnotation => {
    return (
      thisAnnotation.name === selectedAnnotation.name &&
      thisAnnotation.type === selectedAnnotation.type &&
      thisAnnotation.scope === selectedAnnotation.scope
    )
  })
}

/** Set up radio buttons to be all unchecked upon changing dropdown value */
function initChecked(deGenes, checkedGene) {
  const checked = {}
  if (!deGenes) {return checked}
  deGenes.forEach(deGene => {
    checked[deGene.name] = checkedGene && checkedGene === deGene.name
  })
  return checked
}

/** A small icon-like button that downloads DE data as a file */
function DownloadButton({ bucketId, deFilePath }) {
  return (
    <a className="de-download-button"
      onClick={async () => {await downloadBucketFile(bucketId, deFilePath)}}
      data-analytics-name="differential-expression-download"
      data-toggle="tooltip"
      data-original-title="Download all DE genes data for this group"
    >
      <FontAwesomeIcon icon={faDownload}/>
    </a>
  )
}

const columnHelper = createColumnHelper()

/**
 * Tri-state checkbox from React Table example
 * Adapted from: https://github.com/TanStack/table/blob/367a27286d44ab48262c71d8042b169a4e564316/examples/react/expanding/src/main.tsx#LL323C33-L323C33
 */
function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}) {
  const ref = React.useRef(!null)

  React.useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate
    }
  }, [ref, indeterminate])

  return (
    <input
      type="checkbox"
      ref={ref}
      className={`${className } cursor-pointer`}
      {...rest}
    />
  )
}

/** Search genes from DE table */
function searchGenesFromTable(selectedGenes, searchGenes, logProps) {
  searchGenes(selectedGenes)

  // Log this search to Mixpanel
  logSearchFromDifferentialExpression(
    logProps.event, selectedGenes, logProps.species, logProps.rank,
    logProps.clusterName, logProps.annotation.name
  )
}

/** Table of DE data for genes */
function DifferentialExpressionTable({
  genesToShow, searchGenes, checked, clusterName, annotation, species, changeRadio
}) {
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = React.useState([])

  const logProps = {
    species, clusterName, annotation
  }

  const columns = React.useMemo(() => [
    columnHelper.accessor('name', {
      header: ({ table }) => (
        <label>
          <IndeterminateCheckbox
            {...{
              checked: table.getIsAllPageRowsSelected(),
              indeterminate: table.getIsSomePageRowsSelected(),
              onChange(event) {
                const handle = table.getToggleAllPageRowsSelectedHandler()
                handle(event)

                const isAllSelected = !table.getIsAllPageRowsSelected()
                const allGenes = table.getRowModel().rows.map(r => r.original.name)
                const selectedGenes = isAllSelected ? allGenes : []

                logProps.event = event
                logProps.rank = -1
                searchGenesFromTable(selectedGenes, searchGenes, logProps)
              }
            }}
          />
          Name
        </label>
      ),
      cell: deGene => {
        return (
          <label
            title="Click to view gene expression.  Arrow down (↓) and up (↑) to quickly scan."
          >
            <input
              type="checkbox"
              checked={deGene.row.getIsSelected()}
              data-analytics-name="selected-gene-differential-expression"
              value={deGene.getValue()}
              onChange={event => {
                deGene.row.toggleSelected()

                let selectedGenes = table.getSelectedRowModel().rows.map(r => r.original.name)
                const thisGene = deGene.getValue()
                if (deGene.row.getIsSelected()) {
                  selectedGenes = selectedGenes.filter(g => g !== thisGene)
                } else {
                  selectedGenes.push(thisGene)
                }

                logProps.event = event
                logProps.rank = deGene.i

                searchGenesFromTable(selectedGenes, searchGenes, logProps)

                deGene.row.getToggleSelectedHandler()
              }}/>
            {deGene.getValue()}
          </label>
        )
      }
    }),
    columnHelper.accessor('log2FoldChange', {
      header: () => 'LFC',
      cell: deGene => {
        return deGene.getValue()
      }
    }),
    columnHelper.accessor('pvalAdj', {
      header: () => 'Adj. p',
      cell: deGene => {
        return deGene.getValue()
      }
    })
  ]
  , [genesToShow]
  )

  const data = React.useMemo(
    () => genesToShow,
    [genesToShow]
  )

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    state: {
      rowSelection,
      sorting
    },
    enableRowSelection: true, // enable row selection for all rows
    // enableRowSelection: row => row.original.age > 18, // or enable row selection conditionally per row
    onRowSelectionChange: setRowSelection,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting
  })

  return (
    <>
      <table className="de-table table table-terra table-scp-compact">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : (
                    <div
                      {...{
                        className: header.column.getCanSort() ?
                          'cursor-pointer select-none' :
                          '',
                        onClick: header.column.getToggleSortingHandler()
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽'
                      }[header.column.getIsSorted()] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          )
          )}
        </tbody>
      </table>
      <a href="https://forms.gle/qPGH5J9oFkurpbD76" target="_blank" title="Take a 1 minute survey">
          Help improve this new feature
      </a>
    </>
  )
}


//   return (
//     <>
//       <table className="de-table table table-terra table-scp-compact">
//         <thead>
//           <tr>
//             <th>Name</th>
//             <th>
//               <span className="glossary" data-toggle="tooltip" data-original-title="Log (base 2) of fold change">
//               LFC
//               </span>
//             </th>
//             <th>
//               <span className="glossary" data-toggle="tooltip" data-original-title="p-value adjusted with Benjamini-Hochberg FDR correction">
//               Adj. p
//               </span>
//             </th>
//           </tr>
//         </thead>
//         <tbody>
//           {genesToShow.map((deGene, i) => {
//             return (
//               <tr className="de-gene-row" key={i}>
//                 <td>
//                   <label
//                     title="Click to view gene expression.  Arrow down (↓) and up (↑) to quickly scan."
//                   ><input
//                       type="radio"
//                       checked={checked[deGene.name]}
//                       data-analytics-name="selected-gene-differential-expression"
//                       value={deGene.name}
//                       onClick={event => {
//                         searchGenes([deGene.name])

//                         // Log this search to Mixpanel
//                         const rank = i
//                         logSearchFromDifferentialExpression(
//                           event, deGene, species, rank,
//                           clusterName, annotation.name
//                         )

//                         changeRadio(event)
//                       }}/>
//                     {deGene.name}</label></td>
//                 <td>{deGene.log2FoldChange}</td>
//                 <td>{deGene.pvalAdj}</td>
//               </tr>)
//           })}
//         </tbody>
//       </table>
//       <a href="https://forms.gle/qPGH5J9oFkurpbD76" target="_blank" title="Take a 1 minute survey">
//       Help improve this new feature
//       </a>
//     </>
//   )
// }

/** Differential expression panel shown at right in Explore tab */
export default function DifferentialExpressionPanel({
  deGroup, deGenes, searchGenes,
  exploreInfo, exploreParamsWithDefaults, setShowDeGroupPicker, setDeGenes, setDeGroup,
  countsByLabel, numRows=50
}) {
  const clusterName = exploreParamsWithDefaults?.cluster
  const bucketId = exploreInfo?.bucketId
  const annotation = getAnnotationObject(exploreParamsWithDefaults, exploreInfo)
  const deObjects = exploreInfo?.differentialExpression

  const delayedDETableLogTimeout = useRef(null)

  // filter text for searching the legend
  const [genesToShow, setGenesToShow] = useState(deGenes)
  const [searchedGene, setSearchedGene] = useState('')

  const [checked, setChecked] = useState(initChecked(deGenes))
  const [deFilePath, setDeFilePath] = useState(null)

  const species = exploreInfo?.taxonNames

  /** Check radio button such that changing group unchecks all buttons */
  function changeRadio(event) {
    const newChecked = initChecked(deGenes, event.target.value)
    setChecked(newChecked)
  }

  /** Handle a user pressing the 'x' to clear the field */
  function handleClear() {
    updateSearchedGene('', 'clear')
    setGenesToShow(deGenes.slice(0, numRows))
  }

  /** Only show clear button if text is entered in search box */
  const showClear = searchedGene !== ''

  function updateSearchedGene(newSearchedGene, trigger) {
    setSearchedGene(newSearchedGene)

    // Log search on DE table after 1 second since last change
    // This prevents logging "searches" on "P", "T", "E", and "N" if
    // the string "PTEN" is typed in a speed plausible for someone who
    // knows they want to search PTEN, without stopping to explore interstitial
    // results in the DE table.
    clearTimeout(delayedDETableLogTimeout.current)
    delayedDETableLogTimeout.current = setTimeout(() => {
      const otherProps = { trigger }
      const genes = [newSearchedGene]
      logDifferentialExpressionTableSearch(genes, species, otherProps)
    }, 1000)
  }

  /** Update genes in table based on what user searches */
  useEffect(() => {
    let filteredGenes
    if (searchedGene === '') {
      filteredGenes = deGenes
    } else {
      const lowerCaseSearchedGene = searchedGene.toLowerCase()
      filteredGenes = deGenes.filter(d => d.name.toLowerCase().includes(lowerCaseSearchedGene))
    }

    if (deGenes) {filteredGenes = filteredGenes.slice(0, numRows)}
    setGenesToShow(filteredGenes)
  }, [deGenes, searchedGene])

  return (
    <>
      <DifferentialExpressionGroupPicker
        bucketId={bucketId}
        clusterName={clusterName}
        annotation={annotation}
        setShowDeGroupPicker={setShowDeGroupPicker}
        deGenes={deGenes}
        setDeGenes={setDeGenes}
        deGroup={deGroup}
        setDeGroup={setDeGroup}
        countsByLabel={countsByLabel}
        deObjects={deObjects}
        setDeFilePath={setDeFilePath}
      />

      {genesToShow &&
      <>
        <div className="de-search-box">
          <span className="de-search-icon">
            <FontAwesomeIcon icon={faSearch} />
          </span>
          <input
            className="de-search-input no-border"
            name="de-search-input"
            type="text"
            autoComplete="off"
            placeholder="Find a gene" // Consensus per demo, to distinguish from main "Search genes" in same UI
            value={searchedGene}
            onChange={event => updateSearchedGene(event.target.value, 'keydown')}
            data-analytics-name="differential-expression-search"
          />
          { showClear && <Button
            type="button"
            data-analytics-name="clear-de-search"
            className="clear-de-search-icon"
            aria-label="Clear"
            onClick={handleClear} >
            <FontAwesomeIcon icon={faTimes} />
          </Button> }
        </div>

        <div className="de-table-buttons">
          <DownloadButton bucketId={bucketId} deFilePath={deFilePath} />
          <DifferentialExpressionModal />
        </div>

        <DifferentialExpressionTable
          genesToShow={genesToShow}
          searchGenes={searchGenes}
          checked={checked}
          clusterName={clusterName}
          annotation={annotation}
          species={species}
          changeRadio={changeRadio}
        />
      </>
      }
    </>
  )
}

/** Top matter for differential expression panel shown at right in Explore tab */
export function DifferentialExpressionPanelHeader({
  setDeGenes, setDeGroup, setShowDifferentialExpressionPanel, setShowUpstreamDifferentialExpressionPanel, isUpstream,
  cluster, annotation
}) {
  return (
    <>
      <span>Differential expression</span>
      <button className="action fa-lg"
        onClick={() => {
          setDeGenes(null)
          setDeGroup(null)
          setShowDifferentialExpressionPanel(false)
          setShowUpstreamDifferentialExpressionPanel(false)
        }}
        title="Exit differential expression panel"
        data-analytics-name="differential-expression-panel-exit">
        <FontAwesomeIcon icon={faArrowLeft}/>
      </button>
      {isUpstream &&
        <>
          <div className="de-nondefault-explainer">
          No DE results for:
            <br/><br/>
            <ul className="no-de-summary">
              <li>
                <span className="bold">Clustering</span><br/>
                {cluster}
              </li>
              <br/>
              <li>
                <span className="bold">Annotation</span><br/>
                {annotation.name}
              </li>
            </ul>
            <br/>
          Explore DE results in:
          </div>
        </>
      }
    </>
  )
}
