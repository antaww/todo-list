export function exportToCsv(data: any[], fileName: string): void {
	if (!data || data.length === 0) {
		console.warn('No data to export.');
		return;
	}

	const csvRows: string[] = [];
	const headers = Object.keys(data[0]);
	csvRows.push(headers.join(','));

	for (const row of data) {
		const values = headers.map(header => {
			let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
			cell = cell.replace(/"/g, '""'); // Escape double quotes
			if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
				cell = `"${cell}"`; // Enclose in double quotes if it contains comma, newline, or quote
			}
			return cell;
		});
		csvRows.push(values.join(','));
	}

	const csvString = csvRows.join('\n');
	const blob = new Blob([csvString], {type: 'text/csv;charset=utf-8;'});

	const link = document.createElement('a');
	if (link.download !== undefined) { // Check if HTML5 download attribute is supported
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} else {
		// Fallback for browsers that do not support the download attribute
		// This might open the CSV in a new window or tab depending on the browser's behavior
		const navigatorAlias = navigator as any;
		if (navigatorAlias.msSaveBlob) { // For IE 10+
			navigatorAlias.msSaveBlob(blob, fileName);
		} else {
			// For other browsers, attempt to open in a new window.
			// This is not ideal as it might not trigger a download directly.
			const a = window.open('about:blank', '_blank');
			if (a) {
				a.document.write('sep=,\r\n' + csvString);
				a.document.close();
				a.focus();
				a.print(); // This is a hack for some browsers to trigger download dialog
				a.close();
			}
		}
		console.warn('HTML5 download attribute not supported. CSV export might not work as expected.');
	}
}

export async function importFromCsv(file: File): Promise<any[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event: ProgressEvent<FileReader>) => {
			const text = event.target?.result as string;
			if (!text) {
				reject(new Error('File is empty or could not be read.'));
				return;
			}

			const rows = text.split('\n').filter(row => row.trim() !== '');
			if (rows.length < 1) {
				reject(new Error('CSV file has no header row.'));
				return;
			}

			const headerRow = rows.shift()!;
			// Regex to split CSV row, handling quoted fields with commas
			// Matches commas that are not inside quotes. Inside quotes, it allows any character including escaped quotes.
			const regex = /,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/;
			const headers = headerRow.split(regex).map(h => h.trim().replace(/^"|"$/g, ''));

			const data = rows.map(rowString => {
				const values = rowString.split(regex);
				const obj: any = {};
				headers.forEach((header, index) => {
					let value = values[index] ? values[index].trim() : '';
					// Remove surrounding quotes if present, and unescape double quotes
					if (value.startsWith('"') && value.endsWith('"')) {
						value = value.substring(1, value.length - 1).replace(/""/g, '"');
					}
					obj[header] = value;
				});
				return obj;
			});

			resolve(data);
		};

		reader.onerror = () => {
			reject(new Error('Error reading file.'));
		};

		reader.readAsText(file);
	});
} 