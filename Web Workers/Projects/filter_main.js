// Get the worker module
const { Worker } = require('worker_threads');

const arr_len = 20;

const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

// Instantiate the values in the shared array
for (let i = 0; i < arr_len; i++) 
{
    sharedArray[i] = i;
}
console.log("Initial array:", sharedArray);


function runWorker(sharedData, resultBuffer, indexStart, indexEnd, outputStart, predicate)
{
    const dataForWorker = {
        sharedBuffer: sharedData,
        resultBuffer: resultBuffer,
        indexStart: indexStart,
        indexEnd: indexEnd,
        outputStart: outputStart,
        predicate: predicate,
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./filter_worker.js', { workerData: dataForWorker });

        // Get the message back from the thread
        worker.on('message', (msg) => {
            resolve(msg);
        });    
        worker.on('error', reject);
        worker.on('exit', (code) => {
        if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

function create_workers(sharedBuffer, resultBuffer, indexArray, n_workers, chunk_size, predicate) 
{
    // Instantiate a batch of workers
    const workers = [];
    let outputStart = 0;

    for (let i = 0; i < n_workers; i++)
    {   
        const start = i * chunk_size;
        const end = Math.min(start + chunk_size, arr_len);

        if (indexArray){
            outputStart = indexArray[i];
        }

        if (start < end) {
            workers.push(runWorker(sharedBuffer, resultBuffer, start, end, outputStart, predicate));
        }
    }

    return workers;
}

async function run(n_workers)
{
    // Split the array into equal chunks
    const chunk_size = Math.ceil(arr_len / n_workers);

    // Create a batch of workers
    let workers = create_workers(sharedBuffer, null, null, n_workers, chunk_size, 'filter_1');

    // Wait for all workers and collect their messages
    // Additionally, get the total number of predicate results for each thread 
    const results = await Promise.all(workers);

    const indexArray = new Array(n_workers + 1).fill(0);
    for (let i = 0; i < n_workers; i++)
    {
        indexArray[i + 1] = indexArray[i] + results[i];
    }

    // Create a shared buffer for the new filtered array
    const resultBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * indexArray.at(-1));

    workers = create_workers(sharedBuffer, resultBuffer, indexArray, n_workers, chunk_size, 'filter_2');

    await Promise.all(workers);
    
    const finalArray = new Int32Array(resultBuffer);

    console.log(finalArray);

}

run(4);
