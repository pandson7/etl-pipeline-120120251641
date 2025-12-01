import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://v2ufgo2cl9.execute-api.us-east-1.amazonaws.com/prod';

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`);
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.parquet')) {
      setSelectedFile(file);
      setMessage('');
    } else {
      setMessage('Please select a .parquet file');
      setSelectedFile(null);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setMessage('Uploading file...');

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: { 'Content-Type': 'application/octet-stream' }
        });

        if (uploadResponse.ok) {
          setMessage('File uploaded successfully!');
          setSelectedFile(null);
          document.getElementById('fileInput').value = '';
          fetchJobs();
        } else {
          setMessage('Upload failed');
        }
      } else {
        setMessage(data.error || 'Upload failed');
      }
    } catch (error) {
      setMessage('Upload error: ' + error.message);
    }

    setUploading(false);
  };

  const triggerJob = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/trigger-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('ETL job started successfully!');
        fetchJobs();
      } else {
        setMessage(data.error || 'Failed to start job');
      }
    } catch (error) {
      setMessage('Error starting job: ' + error.message);
    }
  };

  const downloadResult = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/download/${jobId}`);
      const data = await response.json();
      
      if (response.ok) {
        window.open(data.downloadUrl, '_blank');
      } else {
        setMessage(data.error || 'Download failed');
      }
    } catch (error) {
      setMessage('Download error: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#ffa500';
      case 'RUNNING': return '#007bff';
      case 'COMPLETED': return '#28a745';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>ETL Pipeline Dashboard</h1>
        <p>Upload Parquet files and convert them to JSON</p>
      </header>

      <main className="App-main">
        <div className="upload-section">
          <h2>Upload Parquet File</h2>
          <div className="upload-form">
            <input
              id="fileInput"
              type="file"
              accept=".parquet"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <button
              onClick={uploadFile}
              disabled={!selectedFile || uploading}
              className="upload-btn"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
          {message && <div className="message">{message}</div>}
        </div>

        <div className="jobs-section">
          <h2>ETL Jobs</h2>
          {jobs.length === 0 ? (
            <p>No jobs found. Upload a file to get started.</p>
          ) : (
            <div className="jobs-grid">
              {jobs.map((job) => (
                <div key={job.jobId} className="job-card">
                  <div className="job-header">
                    <h3>{job.fileName}</h3>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(job.status) }}
                    >
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="job-details">
                    <p><strong>Job ID:</strong> {job.jobId}</p>
                    <p><strong>Created:</strong> {formatDate(job.createdAt)}</p>
                    <p><strong>Updated:</strong> {formatDate(job.updatedAt)}</p>
                    {job.processingTime && (
                      <p><strong>Processing Time:</strong> {job.processingTime}s</p>
                    )}
                    {job.errorMessage && (
                      <p className="error-message"><strong>Error:</strong> {job.errorMessage}</p>
                    )}
                  </div>

                  <div className="job-actions">
                    {job.status === 'PENDING' && (
                      <button
                        onClick={() => triggerJob(job.jobId)}
                        className="action-btn trigger-btn"
                      >
                        Start ETL Job
                      </button>
                    )}
                    {job.status === 'COMPLETED' && (
                      <button
                        onClick={() => downloadResult(job.jobId)}
                        className="action-btn download-btn"
                      >
                        Download JSON
                      </button>
                    )}
                    {job.status === 'RUNNING' && (
                      <div className="loading-spinner">Processing...</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
