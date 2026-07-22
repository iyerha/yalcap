(function () {
    /** @type {RuntimeAutocompleteModule | undefined} */
    var runtimeNamespace = window.runtimeAutocomplete || window.autocompleteRuntime;
    if (runtimeNamespace && runtimeNamespace.initialized) {
        return;
    }

    function toItems(payload, labelField, valueField) {
        var list = [];
        if (Array.isArray(payload)) {
            list = payload;
        } else if (payload && Array.isArray(payload.items)) {
            list = payload.items;
        } else if (payload && Array.isArray(payload.results)) {
            list = payload.results;
        } else if (payload && Array.isArray(payload.data)) {
            list = payload.data;
        }

        var out = [];
        for (var i = 0; i < list.length; i += 1) {
            var item = list[i];
            var label = '';
            var value = '';

            if (item == null) {
                continue;
            }

            if (typeof item === 'object') {
                label = String(item[labelField] == null ? '' : item[labelField]).trim();
                value = String(item[valueField] == null ? '' : item[valueField]).trim();
                if (!label && value) {
                    label = value;
                }
                if (!value && label) {
                    value = label;
                }
            } else {
                label = String(item).trim();
                value = label;
            }

            if (!label || !value) {
                continue;
            }

            out.push({ label: label, value: value });
        }

        return out;
    }

    function normalizeKey(value) {
        return String(value == null ? '' : value).trim().toLowerCase();
    }

    function parseInteger(value, fallback) {
        var parsed = Number.parseInt(String(value == null ? '' : value), 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }
        return parsed;
    }

    function setState(input, state) {
        if (!input) {
            return;
        }
        input.setAttribute('data-autocomplete-state', state);
        var host = input.closest('.resolved-control');
        if (host) {
            host.setAttribute('data-autocomplete-state', state);
        }

        var spinnerNode = null;
        var valueInputId = (input.dataset.autocompleteValueId || '').trim();
        if (valueInputId) {
            spinnerNode = document.querySelector('[data-autocomplete-spinner-for="' + valueInputId + '"]');
        }
        if (spinnerNode) {
            if (state === 'loading') {
                spinnerNode.classList.remove('hidden');
            } else {
                spinnerNode.classList.add('hidden');
            }
        }

        var statusNode = null;
        if (valueInputId) {
            statusNode = document.querySelector('[data-autocomplete-status-for="' + valueInputId + '"]');
        }
        if (!statusNode) {
            return;
        }

        var message = '';
        if (state === 'loading') {
            message = 'Loading suggestions...';
        } else if (state === 'empty') {
            message = 'No matches found.';
        } else if (state === 'error') {
            message = 'Could not load suggestions.';
        }

        statusNode.textContent = message;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function highlightLabel(label, query) {
        var text = String(label == null ? '' : label);
        var q = String(query == null ? '' : query).trim();
        if (!q) {
            return escapeHtml(text);
        }

        var lowerText = text.toLowerCase();
        var lowerQuery = q.toLowerCase();
        var start = lowerText.indexOf(lowerQuery);
        if (start < 0) {
            return escapeHtml(text);
        }

        var end = start + q.length;
        var before = escapeHtml(text.slice(0, start));
        var match = escapeHtml(text.slice(start, end));
        var after = escapeHtml(text.slice(end));
        return before + '<mark>' + match + '</mark>' + after;
    }

    function renderDatalist(datalist, items) {
        while (datalist.firstChild) {
            datalist.removeChild(datalist.firstChild);
        }

        for (var i = 0; i < items.length; i += 1) {
            var item = items[i];
            var option = document.createElement('option');
            option.value = item.label;
            option.setAttribute('data-submit-value', item.value);
            option.label = item.label;
            option.textContent = item.label;
            datalist.appendChild(option);
        }
    }

    function optionsFromDatalist(datalist) {
        if (!datalist) {
            return [];
        }

        var out = [];
        var options = datalist.querySelectorAll('option');
        for (var i = 0; i < options.length; i += 1) {
            var option = options[i];
            var label = String(option.value || '').trim();
            var submitValue = String(option.getAttribute('data-submit-value') || option.value || '').trim();
            if (!label || !submitValue) {
                continue;
            }
            out.push({ label: label, value: submitValue });
        }

        return out;
    }

    function buildLookup(datalist) {
        var lookup = {};
        if (!datalist) {
            return lookup;
        }

        var options = datalist.querySelectorAll('option');
        for (var i = 0; i < options.length; i += 1) {
            var option = options[i];
            var optionLabel = String(option.value || '').trim();
            var submitValue = String(option.getAttribute('data-submit-value') || option.value || '').trim();
            var key = normalizeKey(optionLabel);
            if (!key || !submitValue || Object.prototype.hasOwnProperty.call(lookup, key)) {
                continue;
            }
            lookup[key] = submitValue;
        }

        return lookup;
    }

    function syncHiddenValue(input, hiddenInput, datalist, allowFreeText) {
        if (!input || !hiddenInput) {
            return;
        }

        var typed = String(input.value || '').trim();
        if (!typed) {
            hiddenInput.value = '';
            input.removeAttribute('data-autocomplete-match');
            input.setCustomValidity('');
            return;
        }

        var lookup = buildLookup(datalist);
        var submitValue = lookup[normalizeKey(typed)] || '';
        if (submitValue) {
            hiddenInput.value = submitValue;
            input.setAttribute('data-autocomplete-match', 'true');
            input.setCustomValidity('');
            return;
        }

        if (allowFreeText) {
            hiddenInput.value = typed;
            input.setAttribute('data-autocomplete-match', 'free-text');
            input.setCustomValidity('');
            return;
        }

        hiddenInput.value = '';
        input.setAttribute('data-autocomplete-match', 'false');
        input.setCustomValidity('Select a value from suggestions.');
    }

    function wireAutocompleteInput(input) {
        if (!input || input.dataset.autocompleteBound === 'true') {
            return;
        }

        var sourceType = (input.dataset.autocompleteSourceType || 'static').trim().toLowerCase();
        var endpoint = (input.dataset.autocompleteSourceUrl || '').trim();
        var listId = (input.dataset.autocompleteListId || '').trim();
        var listboxId = (input.dataset.autocompleteListboxId || '').trim();
        var valueInputId = (input.dataset.autocompleteValueId || '').trim();
        var searchParam = (input.dataset.autocompleteSearchParam || 'q').trim() || 'q';
        var labelField = (input.dataset.autocompleteLabelField || 'label').trim() || 'label';
        var valueField = (input.dataset.autocompleteValueField || 'value').trim() || 'value';
        var minChars = parseInteger(input.dataset.autocompleteMinChars, 2);
        var maxResults = parseInteger(input.dataset.autocompleteMaxResults, 25);
        var allowFreeText = (input.dataset.autocompleteAllowFreeText || 'false').trim().toLowerCase() === 'true';
        var datalist = listId ? document.getElementById(listId) : null;
        var listbox = listboxId ? document.getElementById(listboxId) : null;
        var menu = valueInputId ? document.querySelector('[data-autocomplete-menu-for="' + valueInputId + '"]') : null;
        var hiddenInput = valueInputId ? document.getElementById(valueInputId) : null;

        if (!datalist || !hiddenInput || !listbox || !menu) {
            input.dataset.autocompleteBound = 'true';
            return;
        }

        var staticItems = optionsFromDatalist(datalist);
        var visibleItems = staticItems.slice();
        var activeIndex = -1;

        function setExpanded(expanded) {
            input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }

        function setActiveIndex(nextIndex) {
            if (visibleItems.length === 0) {
                activeIndex = -1;
                input.removeAttribute('aria-activedescendant');
                return;
            }

            if (nextIndex < 0) {
                nextIndex = visibleItems.length - 1;
            }
            if (nextIndex >= visibleItems.length) {
                nextIndex = 0;
            }

            activeIndex = nextIndex;
            var activeId = listbox.id + '-opt-' + String(activeIndex);
            input.setAttribute('aria-activedescendant', activeId);

            var options = listbox.querySelectorAll('[role="option"]');
            for (var i = 0; i < options.length; i += 1) {
                var selected = i === activeIndex;
                options[i].setAttribute('aria-selected', selected ? 'true' : 'false');
                options[i].classList.toggle('is-active', selected);
            }
        }

        function closeMenu() {
            menu.classList.add('hidden');
            setExpanded(false);
            activeIndex = -1;
            input.removeAttribute('aria-activedescendant');
        }

        function openMenu() {
            if (visibleItems.length === 0) {
                closeMenu();
                return;
            }
            menu.classList.remove('hidden');
            setExpanded(true);
        }

        function selectItem(item) {
            if (!item) {
                return;
            }

            input.value = item.label;
            hiddenInput.value = item.value;
            input.setAttribute('data-autocomplete-match', 'true');
            input.setCustomValidity('');
            setState(input, 'ready');
            closeMenu();
        }

        function renderListbox(items, query) {
            visibleItems = Array.isArray(items) ? items.slice() : [];
            while (listbox.firstChild) {
                listbox.removeChild(listbox.firstChild);
            }

            for (var i = 0; i < visibleItems.length; i += 1) {
                var item = visibleItems[i];
                var option = document.createElement('li');
                option.id = listbox.id + '-opt-' + String(i);
                option.className = 'runtime-autocomplete-option';
                option.setAttribute('role', 'option');
                option.setAttribute('aria-selected', 'false');
                option.setAttribute('data-submit-value', item.value);
                option.innerHTML = highlightLabel(item.label, query);
                option.addEventListener('mousedown', function (event) {
                    event.preventDefault();
                    var submit = event.currentTarget.getAttribute('data-submit-value');
                    for (var j = 0; j < visibleItems.length; j += 1) {
                        if (visibleItems[j].value === submit) {
                            selectItem(visibleItems[j]);
                            break;
                        }
                    }
                });
                listbox.appendChild(option);
            }

            if (visibleItems.length > 0) {
                openMenu();
                setActiveIndex(0);
            } else {
                closeMenu();
            }
        }

        function filterStaticItems(query) {
            var q = normalizeKey(query);
            if (!q) {
                return staticItems.slice(0, maxResults);
            }

            var filtered = [];
            for (var i = 0; i < staticItems.length; i += 1) {
                if (normalizeKey(staticItems[i].label).includes(q)) {
                    filtered.push(staticItems[i]);
                }
                if (filtered.length >= maxResults) {
                    break;
                }
            }
            return filtered;
        }

        syncHiddenValue(input, hiddenInput, datalist, allowFreeText);
        setState(input, 'idle');

        if (sourceType !== 'remote') {
            input.addEventListener('input', function () {
                syncHiddenValue(input, hiddenInput, datalist, allowFreeText);
                var query = String(input.value || '').trim();
                if (query.length < minChars) {
                    closeMenu();
                    setState(input, 'idle');
                    return;
                }

                var filtered = filterStaticItems(query);
                renderListbox(filtered, query);
                setState(input, filtered.length > 0 ? 'ready' : 'empty');
            });
            input.addEventListener('focus', function () {
                syncHiddenValue(input, hiddenInput, datalist, allowFreeText);
                var query = String(input.value || '').trim();
                if (query.length < minChars) {
                    setState(input, 'idle');
                    return;
                }

                var filtered = filterStaticItems(query);
                renderListbox(filtered, query);
                setState(input, filtered.length > 0 ? 'ready' : 'empty');
            });
            input.addEventListener('blur', function () {
                window.setTimeout(closeMenu, 120);
            });
            input.dataset.autocompleteBound = 'true';
            return;
        }

        if (!endpoint) {
            input.dataset.autocompleteBound = 'true';
            setState(input, 'error');
            return;
        }

        var timerId = null;
        var abortController = null;
        var requestSequence = 0;

        function requestSuggestions(query) {
            requestSequence += 1;
            var sequence = requestSequence;

            if (abortController) {
                abortController.abort();
            }

            abortController = new AbortController();
            var url = new URL(endpoint, window.location.origin);
            url.searchParams.set(searchParam, query);
            setState(input, 'loading');

            fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: abortController.signal
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('remote autocomplete request failed');
                    }
                    return response.json();
                })
                .then(function (payload) {
                    if (sequence !== requestSequence) {
                        return;
                    }

                    var items = toItems(payload, labelField, valueField);
                    if (maxResults > 0 && items.length > maxResults) {
                        items = items.slice(0, maxResults);
                    }

                    renderDatalist(datalist, items);
                    renderListbox(items, query);
                    syncHiddenValue(input, hiddenInput, datalist, allowFreeText);
                    setState(input, items.length > 0 ? 'ready' : 'empty');
                })
                .catch(function (error) {
                    if (error && error.name === 'AbortError') {
                        return;
                    }
                    renderDatalist(datalist, []);
                    renderListbox([], query);
                    syncHiddenValue(input, hiddenInput, datalist, allowFreeText);
                    setState(input, 'error');
                });
        }

        function scheduleRequest() {
            if (timerId) {
                window.clearTimeout(timerId);
            }

            var query = (input.value || '').trim();
            syncHiddenValue(input, hiddenInput, datalist, allowFreeText);

            if (query.length < minChars) {
                renderDatalist(datalist, []);
                renderListbox([], query);
                setState(input, 'idle');
                return;
            }

            timerId = window.setTimeout(function () {
                requestSuggestions(query);
            }, 180);
        }

        input.addEventListener('input', scheduleRequest);
        input.addEventListener('focus', scheduleRequest);
        input.addEventListener('blur', function () {
            window.setTimeout(closeMenu, 120);
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowDown') {
                if (visibleItems.length === 0) {
                    return;
                }
                event.preventDefault();
                openMenu();
                setActiveIndex(activeIndex + 1);
                return;
            }

            if (event.key === 'ArrowUp') {
                if (visibleItems.length === 0) {
                    return;
                }
                event.preventDefault();
                openMenu();
                setActiveIndex(activeIndex - 1);
                return;
            }

            if (event.key === 'Enter') {
                if (visibleItems.length === 0 || activeIndex < 0 || activeIndex >= visibleItems.length) {
                    return;
                }
                event.preventDefault();
                selectItem(visibleItems[activeIndex]);
                return;
            }

            if (event.key === 'Escape') {
                closeMenu();
                setState(input, 'idle');
            }
        });
        input.dataset.autocompleteBound = 'true';
    }

    function bindAll() {
        var inputs = document.querySelectorAll('input[data-autocomplete-list-id]');
        for (var i = 0; i < inputs.length; i += 1) {
            wireAutocompleteInput(inputs[i]);
        }
    }

    /** @type {RuntimeAutocompleteModule} */
    var runtimeAutocompleteModule = {
        initialized: true,
        bindAll: bindAll
    };

    window.runtimeAutocomplete = runtimeAutocompleteModule;

    // Secondary neutral alias.
    window.autocompleteRuntime = runtimeAutocompleteModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    document.addEventListener('htmx:afterSwap', bindAll);
})();
