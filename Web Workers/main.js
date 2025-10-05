// Get the worker module
const { Worker } = require('worker_threads');

// Create a function to run the fibonacci sequence
function runFibonacci(n)
{
    return new Promise((resolve, reject) => {
        const worker = new Worker('./worker.js', {
            workerData: n,
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code != 0) 
                reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

(async () => {
    console.time('fibonacci');
    const result = await runFibonacci(40);
    console.timeEnd('fibonacci');
    console.log(`Fibonacci(40) = ${result}`);
})();