(function () {
    if (window.runtimeRepeats && window.runtimeRepeats.initialized) {
        return;
    }

    function asInt(value, fallback) {
        var parsed = Number.parseInt(String(value == null ? '' : value), 10);
        if (!Number.isFinite(parsed)) {
            return fallback;
        }
        return parsed;
    }

    function updateButtons(control, rowsHost, minItems, maxItems) {
        var add = control.querySelector('[data-repeat-add]');
        var removeButtons = rowsHost.querySelectorAll('[data-repeat-remove]');
        var count = rowsHost.querySelectorAll(':scope > .runtime-repeat-row').length;

        if (add) {
            add.disabled = maxItems > 0 && count >= maxItems;
        }

        for (var i = 0; i < removeButtons.length; i += 1) {
            removeButtons[i].disabled = count <= minItems;
        }
    }

    function createRemoveButton(rowsHost) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'runtime-repeat-remove';
        button.setAttribute('data-repeat-remove', '');
        button.textContent = 'Remove';
        button.addEventListener('click', function () {
            var row = button.closest('.runtime-repeat-row');
            if (row && rowsHost.contains(row)) {
                row.remove();
                rowsHost.dispatchEvent(new CustomEvent('repeat:rows-changed'));
            }
        });
        return button;
    }

    function buildRowFromTemplate(template, rowsHost) {
        var row = document.createElement('div');
        row.className = 'runtime-repeat-row';

        var actions = document.createElement('div');
        actions.className = 'runtime-repeat-row-actions';
        actions.appendChild(createRemoveButton(rowsHost));
        row.appendChild(actions);

        var body = document.createElement('div');
        body.className = 'runtime-repeat-row-body';
        body.innerHTML = template.innerHTML;
        row.appendChild(body);

        return row;
    }

    function wireRepeatControl(control) {
        if (!control || control.dataset.repeatBound === 'true') {
            return;
        }

        var template = control.querySelector(':scope > .resolved-children[data-repeat-template]');
        if (!template) {
            control.dataset.repeatBound = 'true';
            return;
        }

        var minItems = Math.max(0, asInt(control.getAttribute('data-repeat-min-items'), 0));
        var maxItems = Math.max(0, asInt(control.getAttribute('data-repeat-max-items'), 0));
        if (maxItems > 0 && maxItems < minItems) {
            maxItems = minItems;
        }

        var rowsHost = document.createElement('div');
        rowsHost.className = 'runtime-repeat-rows';
        template.insertAdjacentElement('afterend', rowsHost);
        template.setAttribute('hidden', 'hidden');

        var add = control.querySelector('[data-repeat-add]');
        if (add) {
            add.addEventListener('click', function () {
                var count = rowsHost.querySelectorAll(':scope > .runtime-repeat-row').length;
                if (maxItems > 0 && count >= maxItems) {
                    return;
                }
                rowsHost.appendChild(buildRowFromTemplate(template, rowsHost));
                rowsHost.dispatchEvent(new CustomEvent('repeat:rows-changed'));
            });
        }

        rowsHost.addEventListener('repeat:rows-changed', function () {
            updateButtons(control, rowsHost, minItems, maxItems);
        });

        var initialRows = Math.max(1, minItems);
        for (var i = 0; i < initialRows; i += 1) {
            rowsHost.appendChild(buildRowFromTemplate(template, rowsHost));
        }
        updateButtons(control, rowsHost, minItems, maxItems);

        control.dataset.repeatBound = 'true';
    }

    function bindAll() {
        var controls = document.querySelectorAll('.resolved-control.widget-repeat');
        for (var i = 0; i < controls.length; i += 1) {
            wireRepeatControl(controls[i]);
        }
    }

    window.runtimeRepeats = {
        initialized: true,
        bindAll: bindAll
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    document.addEventListener('htmx:afterSwap', bindAll);
})();
