function parseHDF5(hdf5File) {
  const group = hdf5File.get('entry');
  const dataset = hdf5File.get('entry/collection_time');
  const value = dataset.value;
  const attrs = dataset.attrs;
  console.log(group)
  console.log(dataset)
  console.log(value)
  console.log(attrs)
}

function fetchHDF5(fileUrl) {
  fetch(file_url)
    .then(function(response) {
      return response.arrayBuffer()
    })
    .then(function(buffer) {
      var f = new hdf5.File(buffer, filename);
      // do something with f;
      // let g = f.get('group');
      // let d = f.get('group/dataset');
      // let v = d.value;
      // let a = d.attrs;
    });
}

function readHDF5() {
  var file_input = document.getElementById('datafile');
  var file = file_input.files[0]; // only one file allowed
  let filename = file.name;
  let reader = new FileReader();
  reader.onloadend = function(evt) {
    let byteArray = evt.target.result;
    var hdf5File = new hdf5.File(byteArray, filename);
    window.hdf5File = hdf5File
    console.log(hdf5File)
    parseHDF5(hdf5File)
  }
  reader.readAsArrayBuffer(file);
  file_input.value = "";
}
