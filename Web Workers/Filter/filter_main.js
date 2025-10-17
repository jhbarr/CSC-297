// Grab DOM elements
const input = document.getElementById('numberInput');
const workerInput = document.getElementById('workerInput');
const chunkInput = document.getElementById('chunkInput');
const button = document.getElementById('sendButton');
const output = document.getElementById('output');

function create_workers(worker, data) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            if (event.data.status === 'done') {
                resolve('done');
            }
        }
        worker.onerror = (error) => {
            console.log("Worker error:", error);
            reject(error);
        };

        // Post the message to the worker
        worker.postMessage(data);
    });
}

async function run_workers(n_workers, max_chunk, arr_len)
{
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer);

    // Create a shared memory buffer to hold the result of the predicate filter on each of the array elements
    const filterBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const filterArray = new Int32Array(filterBuffer);

     // Instantiate the values in the shared array
    for (let i = 0; i < arr_len; i++) 
    {
        sharedArray[i] = i;
    }

    // Get the start time
    const start = performance.now()

    // Create the index chunks of specified size
    const chunks = [];
    for (let i = 0; i < arr_len; i += max_chunk)
    {
        const start = i;
        const end = Math.min(i + max_chunk, arr_len);

        chunks.push([start, end]);
    }

    const worker_chunks = Array.from({ length: n_workers }, () => []);
        chunks.forEach((range, i) => {
            worker_chunks[i % n_workers].push(range);
    });

    // Create the worker objects
    const workers = [];
    for (let i = 0; i < n_workers; i++)
    {
        workers.push(new Worker('filter_worker.js'));
    }

    // Collect all of the promises for the workers
    const workerPromises = workers.map((worker, index) => {
        // Create a data object to pass to the workers
        const worker_data = {
            sharedBuffer: sharedBuffer,
            filterBuffer: filterBuffer,
            indexChunks: worker_chunks[index]
        }

        return create_workers(worker, worker_data);
    });

    // Wait for all of the promises to resolve
    await Promise.all(workerPromises)
        .then(() => {
            console.log("All worker promises resolved");
        })
        .catch((error) => {
            // One or more workers encountered an error
            console.error('One or more workers failed:');
            console.log("This is the error:", error)
    });
    
    // Go through each of the values in the results array
    // If an element in the result array is true, add the element with the corresponding index from the original array to the final array
    const finalArray = [];
    for (let i = 0; i < arr_len; i++) 
    {
        if (filterArray[i])
        {
            finalArray.push(sharedArray[i]);
        }
    }

    // Get the total time of program execution
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [finalArray, totalTime];
}


// Send message to worker when button clicked
button.addEventListener('click', async () => {
    const arr_len = parseInt(input.value);
    const n_workers = parseInt(workerInput.value);
    const max_chunk = parseInt(chunkInput.value);

    try {
        const results = await run_workers(n_workers, max_chunk, arr_len); // wait for promise to resolve
        const arr = results[0];
        const time = results[1];

        console.log('Final array:', arr);
        output.textContent = `Mapped Array: ${arr}\nTime: ${time}`;
    } catch (err) {
        output.textContent = 'Error running workers: ' + err.message;
    }
});