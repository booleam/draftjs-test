import React, { Component } from 'react'

import Base64 from './utils/Base64'
import Crypto from './utils/Crypto'
import { accessId, accessKey, policyText, host } from './oss.config'

export default class Upload extends Component {

  constructor(props) {
    super(props);

    this.upload = this._upload.bind(this);
    this.uploadClick = this._uploadClick.bind(this);
    this.upload = this._upload.bind(this);
    console.log(props);
  }

  _upload(e) {
    // TODO: accept intercept check.
    e.preventDefault();
    const { callback } = this.props;
    let file = this.refs.file.files[0];
    console.log(file);

    if(file) {
      let params = this.getParams();
      console.log(params);
      let formData = new FormData();
      formData.append('OSSAccessKeyId', params.OSSAccessKeyId);
      formData.append('policy', params.policy);
      formData.append('Signature', params.Signature);
      formData.append('key', 'test/' + file.name);
      formData.append('file', file);

      let xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', this.uploadProgress, false);
      xhr.addEventListener('error', this.uploadFailed, false);
      xhr.addEventListener('abort', this.uploadCanceled, false);
      xhr.onload = function() {
        if(xhr.status >= 200 && xhr.status < 300) {
          let url = host + "/test/" + file.name;
          callback(url);
        } else {
          console.log('status error: ', status);
        }
      }

      xhr.open('post', host);
      xhr.send(formData);

      this.url = host + '/test/' + file.name;
    } else {
      console.log('click');
      this.refs.file.click();
    }
  }

  getParams() {
    let policyBase64 = Base64.encode(JSON.stringify(policyText));
    let bytes = Crypto.HMAC(Crypto.SHA1, policyBase64, accessKey, { asBytes: true });
    let signature = Crypto.util.bytesToBase64(bytes);
    return {
      OSSAccessKeyId: accessId,
      policy: policyBase64,
      Signature: signature,
    }
  }

  uploadProgress(event) {
    if(event.lengthComputable) {
      let complete = (event.loaded / event.total * 100 | 0)
      console.log(complete);
    }
  }

  uploadFailed(error) {
    console.log(error);
    alert("upload error");
  }

  uploadCanceled() {
    console.log('upload canceled');
    alert("upload canceled");
  }

  _uploadClick(e) {
    e.preventDefault();
    this.refs.file.click();
  }

  render() {
    const { accept } = this.props;
    return (
      <div>
        <input
          type='file'
          ref='file'
          accept={accept}
          onChange={this.upload}
          style={{display: 'none'}}
        />
        <button
          ref='upload'
          onClick={this.uploadClick}
        >
          Upload
        </button>
      </div>
    );
  }
}
