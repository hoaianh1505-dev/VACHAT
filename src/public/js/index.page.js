document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('getStarted');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-target') || '/login';
        location.href = url;
    });
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
});
