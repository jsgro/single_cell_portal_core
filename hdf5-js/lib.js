/** Parse HDF5 file object */
function parseHDF5(hdf5File) {
  const group = hdf5File.get('entry')
  const dataset = hdf5File.get('entry/collection_time')
  const value = dataset.value
  const attrs = dataset.attrs
  console.log(group)
  console.log(dataset)
  console.log(value)
  console.log(attrs)
}

/** Request HDF5 file from URL and convert it to file object */
function fetchHDF5(fileUrl) {
  fetch(fileUrl)
    .then(response => {
      return response.arrayBuffer()
    })
    .then(buffer => {
      const f = new hdf5.File(buffer, filename)
      // do something with f;
      // let g = f.get('group');
      // let d = f.get('group/dataset');
      // let v = d.value;
      // let a = d.attrs;
    })
}

/** Process HDF5 file selected on web page */
function readHDF5() {
  const file_input = document.getElementById('datafile')
  const file = file_input.files[0] // only one file allowed
  const filename = file.name
  const reader = new FileReader()
  reader.onloadend = function(evt) {
    const byteArray = evt.target.result
    const hdf5File = new hdf5.File(byteArray, filename)
    window.hdf5File = hdf5File
    console.log(hdf5File)
    parseHDF5(hdf5File)
  }
  reader.readAsArrayBuffer(file)
  file_input.value = ''
}
