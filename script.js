$(document).ready(function () {
    const $calculator = $('.calculator');
    const $txtBox = $('#txt-box');
    const $resultDisplay = $('.result');
    let parenCount = 0;

    // Reset view initially
    clearAll();
    $calculator.focus(); // Automatically captures typing on launch

    // --- SECTION A: SCREEN & BUTTON EVENTS ---
    
    function clearAll() {
        $txtBox.text('');
        $resultDisplay.text('0');
        parenCount = 0;
    }

    // Handles button clicks
    $('.button').on('click', function () {
        const btnId = $(this).attr('id');
        processInput(btnId);
    });

    // --- CORE FIX: MUTATION OBSERVER TO SYNC CARET ---
    // This catches every single change inside the text box and forces the cursor to the end
    $txtBox.on('input', function() {
        moveCaretToEnd($txtBox);
    });

    // --- HELPER TO MAP KEYS TO ELEMENT IDs ---
    function getKeyTargetId(key) {
        if (key >= '0' && key <= '9') return key;
        if (key === '+') return 'add';
        if (key === '-') return 'subtract';
        if (key === '*' || key.toLowerCase() === 'x') return 'multiply';
        if (key === '/') return 'divide';
        if (key === '.' || key === ',') return 'decimal';
        if (key === '%') return '%';
        if (key === '(' || key === ')') return '()';
        if (key === 'Enter' || key === '=') return '=';
        if (key === 'Escape') return 'c';
        return null;
    }

    // Helper to escape special characters for jQuery selectors (like "=", "%", "()")
    function getSafeSelector(id) {
        return '#' + id.replace(/([!"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~])/g, '\\$1');
    }

    // --- SECTION B: KEYBOARD INPUT SUPPORT ---
    $(document).on('keydown', function (e) {
        // Checks if the user is interacting with the calculator area
        if (!$txtBox.is(':focus') && !$calculator.is(':focus') && !$(e.target).is('body')) {
            return; 
        }

        const key = e.key;

        // Stop native contenteditable double-typing so our script handles formatting cleanly
        if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
        }

        if (key === 'Backspace') {
            e.preventDefault();
            handleBackspace();
            return;
        }

        const targetId = getKeyTargetId(key);
        if (targetId) {
            if (key === 'Enter' || key === '/') e.preventDefault();
            
            const $btn = $(getSafeSelector(targetId));
            if ($btn.length) {
                $btn.addClass('active');
            }
            processInput(targetId);
        }
    });

    $(document).on('keyup', function (e) {
        const targetId = getKeyTargetId(e.key);
        if (targetId) {
            $(getSafeSelector(targetId)).removeClass('active');
        }
    });

    // --- SECTION C: CORE RUNTIME LOGIC ---
    function processInput(command) {
        switch (command) {
            case 'c':
                clearAll();
                break;
            case '=':
                executeCalculation();
                break;
            case '()':
                handleParentheses();
                break;
            case 'add': appendElement('+'); break;
            case 'subtract': appendElement('-'); break;
            case 'multiply': appendElement('*'); break;
            case 'divide': appendElement('/'); break;
            case 'decimal': appendElement('.'); break;
            default:
                appendElement(command); // Handles 0-9 digits and % symbols
                break;
        }
    }

    function appendElement(char) {
        let currentText = $txtBox.text();
        const lastChar = currentText.slice(-1);
        const operators = ['+', '-', '*', '/', '.'];

        // Replace consecutive duplicate operators dynamically
        if (operators.includes(char) && operators.includes(lastChar)) {
            $txtBox.text(currentText.slice(0, -1) + char);
            moveCaretToEnd($txtBox);
            return;
        }

        $txtBox.text(currentText + char);
        moveCaretToEnd($txtBox);
    }

    function handleBackspace() {
        let currentText = $txtBox.text();
        if (currentText.slice(-1) === '(') parenCount--;
        if (currentText.slice(-1) === ')') parenCount++;
        $txtBox.text(currentText.slice(0, -1));
        moveCaretToEnd($txtBox);
    }

    function handleParentheses() {
        let currentText = $txtBox.text();
        const lastChar = currentText.slice(-1);
        const operators = ['+', '-', '*', '/', ''];

        if (operators.includes(lastChar) || lastChar === '(') {
            $txtBox.text(currentText + '(');
            parenCount++;
        } else if (parenCount > 0 && lastChar !== '(') {
            $txtBox.text(currentText + ')');
            parenCount--;
        }
        moveCaretToEnd($txtBox);
    }

    function executeCalculation() {
        let expression = $txtBox.text();
        if (!expression) return;

        // Convert display operators into computational systems
        expression = expression.replace(/÷/g, '/').replace(/X/gi, '*');

        try {
            // Auto close trailing parentheses mismatches safely
            let tempParenCount = parenCount;
            while (tempParenCount > 0) {
                expression += ')';
                tempParenCount--;
            }

            expression = expression.replace(/%/g, '*0.01');

            const calculateResult = new Function(`return ${expression}`);
            const output = calculateResult();

            if (isNaN(output) || !isFinite(output)) {
                $resultDisplay.text('Error');
            } else {
                const absoluteValue = Math.abs(output);

                // Over a trillion (1,000,000,000,000) triggers scientific notation
                if (absoluteValue >= 1000000000000) {
                    $resultDisplay.text(output.toExponential(6));
                } else {
                    // Standard comma notation for numbers below 1 trillion
                    const roundedOutput = Math.round(output * 1000000) / 1000000;
                    $resultDisplay.text(roundedOutput.toLocaleString('en-US', { maximumFractionDigits: 6 }));
                }
            }
        } catch (error) {
            $resultDisplay.text('Error');
        }
        moveCaretToEnd($txtBox);
    }

    // --- TRACKING UTILITY: FORCE CARET TO END POSITION ---
    function moveCaretToEnd(element) {
        requestAnimationFrame(() => {
            const el = element[0] || element; // Safely unpack jQuery object to raw DOM node
            if (!el) return;
            
            el.focus();
            if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false); // Collapses focus directly to the end boundary
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });
    }
});