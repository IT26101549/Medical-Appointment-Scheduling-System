"use strict";

window.confirmHospitalDelete = (() => {
    let pending;

    return ({record, name, details}, remove) => {
        if (pending) return false;
        const dialog = document.createElement("dialog");
        dialog.className = "hospital-delete-dialog";
        dialog.setAttribute("aria-labelledby", "hospital-delete-title");
        dialog.setAttribute("aria-describedby", "hospital-delete-description");
        dialog.innerHTML = `
            <div class="hospital-delete-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>
                </svg>
            </div>
            <h2 id="hospital-delete-title"></h2>
            <p id="hospital-delete-description">This record will be permanently removed. This action cannot be undone.</p>
            <div class="hospital-delete-record"><strong></strong><span></span></div>
            <label><input type="checkbox"> I understand that this record will be permanently removed.</label>
            <p class="hospital-delete-error" role="alert" hidden></p>
            <div class="hospital-delete-actions">
                <button type="button" class="hospital-delete-keep" autofocus></button>
                <button type="button" class="hospital-delete-remove" disabled></button>
            </div>`;
        const checkbox = dialog.querySelector("input");
        const keepButton = dialog.querySelector(".hospital-delete-keep");
        const removeButton = dialog.querySelector(".hospital-delete-remove");
        const errorMessage = dialog.querySelector(".hospital-delete-error");
        const removeLabel = "Remove " + record;
        dialog.querySelector("h2").textContent = "Remove this " + record + "?";
        dialog.querySelector("strong").textContent = name;
        dialog.querySelector(".hospital-delete-record span").textContent = details;
        keepButton.textContent = "Keep " + record;
        removeButton.textContent = removeLabel;

        let removing = false;
        let removed = false;
        let finish;
        pending = new Promise(resolve => { finish = resolve; });
        const result = pending;
        dialog.addEventListener("close", () => {
            dialog.remove();
            pending = null;
            finish(removed);
        }, {once: true});
        dialog.addEventListener("cancel", event => {
            if (removing) event.preventDefault();
        });
        keepButton.addEventListener("click", () => dialog.close());
        checkbox.addEventListener("change", () => {
            removeButton.disabled = !checkbox.checked;
        });
        removeButton.addEventListener("click", async () => {
            if (!checkbox.checked || removing) return;
            removing = true;
            checkbox.disabled = keepButton.disabled = removeButton.disabled = true;
            removeButton.textContent = "Removing…";
            errorMessage.hidden = true;
            try {
                await remove();
                removed = true;
                dialog.close();
            } catch (error) {
                errorMessage.textContent = error.message || "Could not remove this record.";
                errorMessage.hidden = false;
                removing = false;
                checkbox.disabled = keepButton.disabled = removeButton.disabled = false;
                removeButton.textContent = removeLabel;
            }
        });

        document.body.append(dialog);
        dialog.showModal();
        return result;
    };
})();

