document.addEventListener('contextmenu', event => event.preventDefault());

document.onkeydown = function (e) {
    // Disable F12, Ctrl + Shift + I, Ctrl + Shift + J, Ctrl + U
    if (
        e.keyCode == 123 ||
        (e.ctrlKey && e.shiftKey && e.keyCode == 73) ||
        (e.ctrlKey && e.shiftKey && e.keyCode == 74) ||
        (e.ctrlKey && e.keyCode == 85)
    ) {
        return false;
    }
}

// Content Protection Utilities
const Security = {
    // Simple obfuscation prefix
    PREFIX: 'enc_v1_',

    encrypt: function (text) {
        if (!text) return text;
        if (text.startsWith(this.PREFIX)) return text; // Already encrypted
        try {
            // Double Base64 with a saltish twist (simple XOR-like effect)
            // This is NOT preventing hackers, just casual snoopers.
            const encoded = btoa(encodeURIComponent(text));
            return this.PREFIX + encoded.split('').reverse().join('');
        } catch (e) {
            console.error('Encryption failed', e);
            return text;
        }
    },

    decrypt: function (text) {
        if (!text) return text;
        if (!text.startsWith(this.PREFIX)) return text; // Not encrypted, return as is
        try {
            const content = text.substring(this.PREFIX.length);
            const reversed = content.split('').reverse().join('');
            return decodeURIComponent(atob(reversed));
        } catch (e) {
            console.warn('Decryption failed, returning original', e);
            return text;
        }
    }
};

window.Security = Security;
