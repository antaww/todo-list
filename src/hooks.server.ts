import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();

	// Log detailed error information
	console.error(`[SSR ERROR ${errorId}]`, {
		status,
		message,
		url: event.url.toString(),
		route: event.route?.id,
		method: event.request.method,
		userAgent: event.request.headers.get('user-agent'),
		timestamp: new Date().toISOString(),
		error: {
			name: error instanceof Error ? error.name : 'Unknown',
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : 'No stack trace available',
		},
	});

	// Return a safe error message to the client
	return {
		message: `Something went wrong (ID: ${errorId})`,
		errorId,
	};
};
