// Get the worker module
const { Worker } = require('worker_threads');

const arr_len = 10;

const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

// Instantiate the values in the shared array
for (let i = 0; i < arr_len; i++) 
{
    sharedArray[i] = i;
}
console.log("Initial array:", sharedArray);

function runWorker(sharedData, indexStart, indexEnd, predicate)
{
    const dataForWorker ={
        sharedBuffer: sharedData,
        indexStart: indexStart,
        indexEnd: indexEnd,
        predicate: predicate
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./worker.js', { workerData: dataForWorker });

        worker.on('message', (msg) => {
            console.log(msg);
            resolve();
        });    
        worker.on('error', reject);         // if worker throws
        worker.on('exit', (code) => {
        if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

async function run(n_workers)
{
    // Split the array into equal chunks
    const chunk_size = Math.ceil(arr_len / n_workers);
    const workers = [];
    for (let i = 0; i < n_workers; i++)
    {   
        const start = i * chunk_size;
        const end = Math.min(start + chunk_size, arr_len);

        if (start < end) {
            workers.push(runWorker(sharedBuffer, start, end, 'map'));
        }
    }

    // Wait for all workers
    await Promise.all(workers);

    console.log("Final array:", sharedArray);
}

run(4);