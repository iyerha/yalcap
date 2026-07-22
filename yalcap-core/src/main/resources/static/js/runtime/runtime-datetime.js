(function () {
    function toLocalDateTimeValue(rawValue) {
        var text = String(rawValue == null ? '' : rawValue).trim();
        if (!text) {
            return '';
        }

        var targetFormatter = function (date) {
            var year = String(date.getFullYear()).padStart(4, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            var hours = String(date.getHours()).padStart(2, '0');
            var minutes = String(date.getMinutes()).padStart(2, '0');
            return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
        };

        if (text.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(text)) {
            var zoned = new Date(text);
            if (!Number.isNaN(zoned.getTime())) {
                return targetFormatter(zoned);
            }
        }

        var localDate = new Date(text);
        if (!Number.isNaN(localDate.getTime())) {
            return targetFormatter(localDate);
        }

        return text;
    }

    function wireDateTimeInputs(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var inputs = scope.querySelectorAll('input[type="datetime-local"][data-datetime-value]');
        for (var i = 0; i < inputs.length; i += 1) {
            var input = inputs[i];
            if (input.dataset.runtimeDatetimeBound === 'true') {
                continue;
            }
            input.dataset.runtimeDatetimeBound = 'true';

            var rawValue = input.getAttribute('data-datetime-value') || input.dataset.datetimeValue || '';
            var localValue = toLocalDateTimeValue(rawValue);
            if (localValue) {
                input.value = localValue;
            }
        }
    }

    function onReady() {
        wireDateTimeInputs(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
        onReady();
    }

    document.addEventListener('htmx:load', function (event) {
        wireDateTimeInputs(event.detail && event.detail.elt ? event.detail.elt : document);
    });

    window.runtimeDateTime = {
        wireAll: function () {
            wireDateTimeInputs(document);
        }
    };
})();
