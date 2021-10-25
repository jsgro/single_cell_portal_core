export const METADATA_AND_EXPRESSION_FILE_STUDY = {
  study: {
    '_id': {
      '$oid': '60a2b9f4cc7ba082358b5448'
    },
    'name': 'Chicken raw counts',
    'description': 'Synthetic chicken raw counts',
    'bucket_id': 'fc-458fcddb-bbef-4eb3-b0c6-3d2253df623e',
    'accession': 'SCP34'
  },
  files: [{
    '_id': {
      '$oid': '60a2b9fbcc7ba082358b544a'
    },
    'created_at': '2021-05-17T14:46:19.400-04:00',
    'data_dir': '51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a',
    'description': null,
    'file_type': 'Metadata',
    'generation': '1621277203802483',
    'genome_annotation_id': null,
    'genome_assembly_id': null,
    'human_data': false,
    'human_fastq_url': null,
    'is_spatial': false,
    'name': 'metadata.txt',
    'options': {},
    'parse_status': 'parsed',
    'queued_for_deletion': false,
    'remote_location': '',
    'spatial_cluster_associations': [],
    'status': 'uploaded',
    'study_file_bundle_id': null,
    'study_id': {
      '$oid': '60a2b9f4cc7ba082358b5448'
    },
    'taxon_id': null,
    'updated_at': '2021-05-17T14:48:52.287-04:00',
    'upload_content_type': 'text/plain',
    'upload_file_name': 'metadata.txt',
    'upload_file_size': 7065,
    'use_metadata_convention': true,
    'version': null,
    'x_axis_label': '',
    'x_axis_max': null,
    'x_axis_min': null,
    'y_axis_label': '',
    'y_axis_max': null,
    'y_axis_min': null,
    'z_axis_label': '',
    'z_axis_max': null,
    'z_axis_min': null,
    'upload': {
      'url': 'fake/app/original/metadata.txt'
    }
  }, {
    '_id': {
      '$oid': '60a2b9fccc7ba082358b544f'
    },
    'created_at': '2021-05-17T14:46:20.326-04:00',
    'data_dir': '51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a',
    'description': '',
    'expression_file_info': {
      '_id': {
        '$oid': '6155ef87cc7ba01c87884e77'
      },
      'biosample_input_type': 'Single nuclei',
      'is_raw_counts': false,
      'library_preparation_protocol': '10x 5\' v3',
      'modality': 'Transcriptomic: targeted',
      'raw_counts_associations': [],
      'units': null
    },
    'file_type': 'Expression Matrix',
    'generation': '1621277209804774',
    'genome_annotation_id': null,
    'genome_assembly_id': 'undefined',
    'human_data': false,
    'human_fastq_url': 'null',
    'is_spatial': false,
    'name': 'raw2_chicken_40_cells_4_genes.processed_dense.txt',
    'options': {},
    'parse_status': 'parsed',
    'queued_for_deletion': false,
    'remote_location': '',
    'spatial_cluster_associations': [
      ''
    ],
    'status': 'uploaded',
    'study_file_bundle_id': 'null',
    'study_id': {
      '$oid': '60a2b9f4cc7ba082358b5448'
    },
    'taxon_id': {
      '$oid': '604009b9cc7ba03e1b277a40'
    },
    'updated_at': '2021-09-30T15:11:12.403-04:00',
    'upload_content_type': 'text/plain',
    'upload_file_name': 'raw2_chicken_40_cells_4_genes.processed_dense.txt',
    'upload_file_size': 2551,
    'use_metadata_convention': false,
    'version': 8,
    'x_axis_label': '',
    'x_axis_max': 0,
    'x_axis_min': 0,
    'y_axis_label': '',
    'y_axis_max': 0,
    'y_axis_min': 0,
    'z_axis_label': '',
    'z_axis_max': 0,
    'z_axis_min': 0,
    'upload': {
      'url': 'fake/app/data/51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a/60a2b9fccc7ba082358b544f/original/raw2_chicken_40_cells_4_genes.processed_dense.txt'
    }
  }],
  menu_options: {
    'fonts': [ 'Helvetica Neue', 'Arial'],
    'species': [{
      'id': '604009c1cc7ba03e1b277a59',
      'common_name': 'cat'
    }, {
      'id': '604009b9cc7ba03e1b277a40',
      'common_name': 'chicken'
    }],
    'units': [
      'UMI-corrected raw counts',
      'raw counts'
    ],
    'library_preparation_protocol': [
      '10x 3\' v1',
      'Drop-seq'
    ],
    'modality': [
      'Transcriptomic: unbiased',
      'Transcriptomic: targeted'
    ],
    'biosample_input_type': [
      'Whole cell',
      'Single nuclei',
      'Bulk'
    ],
    'sequence_file_types': [
      'Fastq',
      'BAM'
    ],
    'genome_assemblies': [{
      'id': '604009b9cc7ba03e1b277a42',
      'name': 'Gallus_gallus-5.0',
      'taxon_id': '604009b9cc7ba03e1b277a40'
    }, {
      'id': '604009bacc7ba03e1b277a43',
      'name': 'Gallus_gallus-4.0',
      'taxon_id': '604009b9cc7ba03e1b277a40'
    }, {
      'id': '604009c1cc7ba03e1b277a5a',
      'name': 'Felis_catus_9.0',
      'taxon_id': '604009c1cc7ba03e1b277a59'
    }, {
      'id': '604009c1cc7ba03e1b277a5b',
      'name': 'Felis_catus_8.0',
      'taxon_id': '604009c1cc7ba03e1b277a59'
    }, {
      'id': '604009c2cc7ba03e1b277a5c',
      'name': 'Felis_catus-6.2',
      'taxon_id': '604009c1cc7ba03e1b277a59'
    }]
  }
}

export const EMPTY_STUDY = {
  study: {
    '_id': {
      '$oid': '60a2b9f4cc7ba082358b5448'
    },
    'name': 'Chicken raw counts',
    'description': 'Synthetic chicken raw counts',
    'bucket_id': 'fc-458fcddb-bbef-4eb3-b0c6-3d2253df623e',
    'accession': 'SCP34'
  },
  files: [],
  menu_options: {
    'fonts': ['Helvetica Neue', 'Arial'],
    'species': [{
      'id': '604009c1cc7ba03e1b277a59',
      'common_name': 'cat'
    }, {
      'id': '604009b9cc7ba03e1b277a40',
      'common_name': 'chicken'
    }],
    'units': [
      'UMI-corrected raw counts',
      'raw counts'
    ],
    'library_preparation_protocol': [
      '10x 3\' v1',
      'Drop-seq'
    ],
    'modality': [
      'Transcriptomic: unbiased',
      'Transcriptomic: targeted'
    ],
    'biosample_input_type': [
      'Whole cell',
      'Single nuclei',
      'Bulk'
    ],
    'sequence_file_types': [
      'Fastq',
      'BAM'
    ],
    'genome_assemblies': [{
      'id': '604009b9cc7ba03e1b277a42',
      'name': 'Gallus_gallus-5.0',
      'taxon_id': '604009b9cc7ba03e1b277a40'
    }, {
      'id': '604009bacc7ba03e1b277a43',
      'name': 'Gallus_gallus-4.0',
      'taxon_id': '604009b9cc7ba03e1b277a40'
    }, {
      'id': '604009c1cc7ba03e1b277a5a',
      'name': 'Felis_catus_9.0',
      'taxon_id': '604009c1cc7ba03e1b277a59'
    }, {
      'id': '604009c1cc7ba03e1b277a5b',
      'name': 'Felis_catus_8.0',
      'taxon_id': '604009c1cc7ba03e1b277a59'
    }, {
      'id': '604009c2cc7ba03e1b277a5c',
      'name': 'Felis_catus-6.2',
      'taxon_id': '604009c1cc7ba03e1b277a59'
    }]
  }
}

export const RAW_COUNTS_FILE = {
  '_id': {
    '$oid': '60a2b9fccc7ba082358b5400'
  },
  'created_at': '2021-05-17T14:46:20.326-04:00',
  'data_dir': '51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a',
  'description': '',
  'expression_file_info': {
    '_id': {
      '$oid': '6155ef87cc7ba01c87884e77'
    },
    'biosample_input_type': 'Single nuclei',
    'is_raw_counts': true,
    'library_preparation_protocol': '10x 5\' v3',
    'modality': 'Transcriptomic: targeted',
    'raw_counts_associations': [],
    'units': 'Whole cell'
  },
  'file_type': 'Expression Matrix',
  'generation': '1621277209804774',
  'genome_annotation_id': null,
  'genome_assembly_id': 'undefined',
  'human_data': false,
  'human_fastq_url': 'null',
  'is_spatial': false,
  'name': 'example_raw_counts.txt',
  'options': {},
  'parse_status': 'parsed',
  'queued_for_deletion': false,
  'remote_location': '',
  'spatial_cluster_associations': [
    ''
  ],
  'status': 'uploaded',
  'study_file_bundle_id': 'null',
  'study_id': {
    '$oid': '60a2b9f4cc7ba082358b5448'
  },
  'taxon_id': {
    '$oid': '604009b9cc7ba03e1b277a40'
  },
  'updated_at': '2021-09-30T15:11:12.403-04:00',
  'upload_content_type': 'text/plain',
  'upload_file_name': 'example_raw_counts.txt',
  'upload_file_size': 2551,
  'use_metadata_convention': false,
  'version': 8,
  'x_axis_label': '',
  'x_axis_max': 0,
  'x_axis_min': 0,
  'y_axis_label': '',
  'y_axis_max': 0,
  'y_axis_min': 0,
  'z_axis_label': '',
  'z_axis_max': 0,
  'z_axis_min': 0,
  'upload': {
    'url': 'fake/app/data/51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a/60a2b9fccc7ba082358b544f/original/raw2_chicken_40_cells_4_genes.processed_dense.txt'
  }
}

export const METADATA_FILE = {
  '_id': {
    '$oid': '60a2b9fbcc7ba082358b544a'
  },
  'created_at': '2021-05-17T14:46:19.400-04:00',
  'data_dir': '51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a',
  'description': null,
  'file_type': 'Metadata',
  'generation': '1621277203802483',
  'genome_annotation_id': null,
  'genome_assembly_id': null,
  'human_data': false,
  'human_fastq_url': null,
  'is_spatial': false,
  'name': 'metadata.txt',
  'options': {},
  'parse_status': 'parsed',
  'queued_for_deletion': false,
  'remote_location': '',
  'spatial_cluster_associations': [],
  'status': 'uploaded',
  'study_file_bundle_id': null,
  'study_id': {
    '$oid': '60a2b9f4cc7ba082358b5448'
  },
  'taxon_id': null,
  'updated_at': '2021-05-17T14:48:52.287-04:00',
  'upload_content_type': 'text/plain',
  'upload_file_name': 'metadata.txt',
  'upload_file_size': 7065,
  'use_metadata_convention': true,
  'version': null,
  'x_axis_label': '',
  'x_axis_max': null,
  'x_axis_min': null,
  'y_axis_label': '',
  'y_axis_max': null,
  'y_axis_min': null,
  'z_axis_label': '',
  'z_axis_max': null,
  'z_axis_min': null,
  'upload': {
    'url': 'fake/app/original/metadata.txt'
  }
}

export const EXPRESSION_FILE = {
  '_id': {
    '$oid': '60a2b9fccc7ba082358b544f'
  },
  'created_at': '2021-05-17T14:46:20.326-04:00',
  'data_dir': '51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a',
  'description': '',
  'expression_file_info': {
    '_id': {
      '$oid': '6155ef87cc7ba01c87884e77'
    },
    'biosample_input_type': 'Single nuclei',
    'is_raw_counts': false,
    'library_preparation_protocol': '10x 5\' v3',
    'modality': 'Transcriptomic: targeted',
    'raw_counts_associations': [],
    'units': null
  },
  'file_type': 'Expression Matrix',
  'generation': '1621277209804774',
  'genome_annotation_id': null,
  'genome_assembly_id': 'undefined',
  'human_data': false,
  'human_fastq_url': 'null',
  'is_spatial': false,
  'name': 'raw2_chicken_40_cells_4_genes.processed_dense.txt',
  'options': {},
  'parse_status': 'parsed',
  'queued_for_deletion': false,
  'remote_location': '',
  'spatial_cluster_associations': [
    ''
  ],
  'status': 'uploaded',
  'study_file_bundle_id': 'null',
  'study_id': {
    '$oid': '60a2b9f4cc7ba082358b5448'
  },
  'taxon_id': {
    '$oid': '604009b9cc7ba03e1b277a40'
  },
  'updated_at': '2021-09-30T15:11:12.403-04:00',
  'upload_content_type': 'text/plain',
  'upload_file_name': 'raw2_chicken_40_cells_4_genes.processed_dense.txt',
  'upload_file_size': 2551,
  'use_metadata_convention': false,
  'version': 8,
  'x_axis_label': '',
  'x_axis_max': 0,
  'x_axis_min': 0,
  'y_axis_label': '',
  'y_axis_max': 0,
  'y_axis_min': 0,
  'z_axis_label': '',
  'z_axis_max': 0,
  'z_axis_min': 0,
  'upload': {
    'url': 'fake/app/data/51e9c0d33e9b698b118bbb884fab092a1b2d22a9f4133966010560c60835361a/60a2b9fccc7ba082358b544f/original/raw2_chicken_40_cells_4_genes.processed_dense.txt'
  }
}
