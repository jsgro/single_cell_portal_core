/* eslint-disable require-jsdoc */
import React from 'react'
import DataRepoStudy from "components/search/results/DataRepoStudy";
import SCPStudy from "components/search/results/SCPStudy";

/* handle search result entry and determine if this is an SCP study or Data Repo snapshot/dataset */
export default function ResultDetail({ study }) {
  if ( study.trd_result ) {
    return <DataRepoStudy study={study} />
  } else {
    return <SCPStudy study={study} />
  }
}
