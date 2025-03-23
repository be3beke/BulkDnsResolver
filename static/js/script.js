document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('lookupForm');
    const domainsInput = document.getElementById('domains');
    const lookupBtn = document.getElementById('lookupBtn');
    const exportBtn = document.getElementById('exportBtn');
    const loadingAlert = document.getElementById('loadingAlert');
    const errorAlert = document.getElementById('errorAlert');
    const resultsTable = document.getElementById('resultsTable');
    const resultsBody = document.getElementById('resultsBody');
    const searchInput = document.getElementById('searchResults');

    let currentResults = null;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const domains = domainsInput.value.trim();
        if (!domains) {
            showError('Please enter at least one domain');
            return;
        }

        // Reset UI
        exportBtn.disabled = true;
        hideError();
        showLoading();
        clearResults();

        try {
            const response = await fetch('/lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    domains: domains
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An error occurred during lookup');
            }

            currentResults = data.results;
            displayResults(currentResults);
            exportBtn.disabled = false;
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    });

    // Add search functionality
    searchInput.addEventListener('input', function() {
        if (!currentResults) return;
        const searchTerm = this.value.toLowerCase();
        filterResults(searchTerm);
    });

    function filterResults(searchTerm) {
        const rows = resultsBody.getElementsByTagName('tr');

        for (let row of rows) {
            const domain = row.cells[0].textContent.toLowerCase();
            const txtRecords = row.cells[1].textContent.toLowerCase();
            const status = row.cells[2].textContent.toLowerCase();

            const matches = domain.includes(searchTerm) || 
                          txtRecords.includes(searchTerm) ||
                          status.includes(searchTerm);

            row.style.display = matches ? '' : 'none';
        }
    }

    exportBtn.addEventListener('click', async function() {
        if (!currentResults) return;

        try {
            const response = await fetch('/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ results: currentResults })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dns_lookup_results.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            showError('Failed to export results: ' + error.message);
        }
    });

    function displayResults(results) {
        resultsTable.classList.remove('d-none');
        resultsBody.innerHTML = '';

        results.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(result.domain)}</td>
                <td>${result.success ? escapeHtml(result.txt_records.join('<br>')) : ''}</td>
                <td>${result.success ? 
                    '<span class="badge bg-success">Success</span>' : 
                    `<span class="badge bg-danger">${escapeHtml(result.error)}</span>`
                }</td>
            `;
            resultsBody.appendChild(row);
        });
    }

    function showLoading() {
        loadingAlert.classList.remove('d-none');
        lookupBtn.disabled = true;
    }

    function hideLoading() {
        loadingAlert.classList.add('d-none');
        lookupBtn.disabled = false;
    }

    function showError(message) {
        errorAlert.textContent = message;
        errorAlert.classList.remove('d-none');
    }

    function hideError() {
        errorAlert.classList.add('d-none');
    }

    function clearResults() {
        resultsTable.classList.add('d-none');
        resultsBody.innerHTML = '';
        currentResults = null;
        if (searchInput) searchInput.value = ''; //Added to clear search input
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
