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
