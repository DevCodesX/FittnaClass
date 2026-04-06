export function trackEvent(eventName, payload = {}) {
    if (typeof window === 'undefined') {
        return;
    }

    const event = {
        event: eventName,
        payload,
        timestamp: new Date().toISOString(),
    };

    if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(event);
    }

    window.dispatchEvent(new CustomEvent('fittnaclass-analytics', { detail: event }));
}
