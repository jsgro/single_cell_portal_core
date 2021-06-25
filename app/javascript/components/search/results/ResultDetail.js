import React from 'react'
import DataRepoStudy from "./DataRepoStudy";
import SCPStudy from "./SCPStudy";

/** handle search result entry and determine if this is an SCP study or Data Repo snapshot/dataset */
export default function ResultDetail({ study }) {
  if ( study.tdr_result ) {
    return <DataRepoStudy study={study} />
  } else {
    return <SCPStudy study={study} />
  }
}
