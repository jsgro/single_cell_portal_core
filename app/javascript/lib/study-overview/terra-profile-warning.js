import React from 'react'

export const profileWarning =
  <div className="container">
    <p className="bg-danger">
      The visualization above is attempting to fetch data from this study's private bucket, but it cannot issue an
      access token for the request as you have not completed your Terra profile. This is required in order to set your
      access permissions on the bucket. Please&nbsp;
      <a href="https://support.terra.bio/hc/en-us/articles/360028235911-How-to-register-for-a-Terra-account"
         target="_blank">register for Terra</a>, and then reload this page.
    </p>
  </div>

