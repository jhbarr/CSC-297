// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Create a recursive function to calculate the fibonacci number n
function fibonacci(n)
{
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Get the result and pass it back to the parent thread
const result = fibonacci(workerData);
parentPort.postMessage(result);