/*
------ MAIN MAP CLASS ------
This class is used to execute the logic involved in running parallelized map using 
javascript web workers
-------------------------
*/

export default class Map
{
    // Instance variables
    // CBCB

    /*
    * constructor - Define the instance variables of the class
    * 
    * INPUTS
    *   - thread_count : int -> The number of threads that should be used in this instance of the filtration
    */
    constructor({ thread_count })
    {
        this.thread_count = thread_count;
        this.worker_pool = this.initialize_workers();
    }


    /*
    * initialize_instance_vars() -> Take the input array and create the shared buffers for that array, filter array and
    * index chunk array. Set those equal to the class's instance variables
    * 
    * INPUTS
    *   - array : Array[Any] -> the input array passed to the run_parallel_filter instance method
    *   - input_function : Function -> The filter function 
    * OUTPUTS
    *   - None
    */
    initialize_instance_vars(array, input_function, block_size)
    {
        // Set the input function instance variable
        this.input_function = input_function;

        // Set the block size
        this.block_size = block_size;

        // Create the shared memory buffer and array wrapper for the input array
        const input_array_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * array.length);
        const input_array = new Int32Array(input_array_buffer);
        this.input_array_buffer = input_array_buffer;

        // Copy over the contents of the input array to the input array buffer
        for (let i = 0; i < array.length; i++)
        {
            input_array[i] = array[i];
        }

        // Create the shared memofy buffer and array wrapper for the index info array
        const index_info_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
        const index_info_array = new Int32Array(index_info_buffer);
        this.index_info_buffer = index_info_buffer;

        index_info_array[0] = 0;
        index_info_array[1] = Math.ceil(array.length / this.block_size);

        // Create the index chunk array
        const index_chunk_array = [];
        for (let i = 0; i < array.length; i += this.block_size)
        {
            const start = i;
            const end = Math.min(i + this.block_size, array.length);
            index_chunk_array.push([start, end]);
        }
        this.index_chunk_array = index_chunk_array;

        return input_array;
    }


    /*
    * initialize_workers() -> This function initializes an array of worker objects. This is the worker pool that can be used
    * in between executions of this class
    * 
    * INPUTS
    *   - thread_count : int -> The number of workers that should be created
    * OUTPUTS
    *   - worker_pool : Array[Worker] -> An array of worker objects
    */
    initialize_workers()
    {
        let worker_pool = [];
        for (let i = 0; i < this.thread_count; i++)
        {
            const worker = new Worker('./Map/map_worker.js');
            worker_pool.push(worker);
        }

        return worker_pool;
    }


    /*
    * create_workers() -> This function creates an array of worker promise objects. These promises are used to keep
    * track of when all of the workers have finished their tasks
    * 
    * INPUTS
    *   - worker_pool : Array[Worker] -> The array of workers that should execute the parallel filter
    * OUTPUTS
    *   - worker_promises : Array[Worker] -> An array of promise objects that keep track of the status of each worker
    */
    create_workers()
    {
        const worker_promises = this.worker_pool.map((worker, index) => {
            return new Promise((resolve, reject) => {
                worker.onmessage = (event) => {
                    resolve(event.data);
                };
                worker.onerror = (error) => {
                    reject(error);
                };

                const data = {
                    input_array_buffer: this.input_array_buffer,
                    input_func_string: this.input_function.toString(),
                    index_chunk_array: this.index_chunk_array,
                    index_info_buffer: this.index_info_buffer
                };

                worker.postMessage(data);
            });
        });

        return worker_promises
    }


    /*
    * run_parallel_map() -> This function executes the parallel mapping on the specified array using the specified function
    * 
    * INPUTS 
    *   - array : Array[Any] -> An array of any type. NOTE - each element in the array must be of the same type
    *   - input_function : Function -> The filtration predicate function that will be executed on each array element
    * OUTPUTS
    *   - final_array : Array[Any] -> The final filtered array
    *   - total_time : float -> The time it took for the filtration to execute
    */
    async run_parallel_map({ array, input_function, block_size })
    {
        // Initialize the necessary object instance variables
        const final_array = this.initialize_instance_vars(array, input_function, block_size);

        // Get the current time
        const start = performance.now();

        // Await for worker_promises to entirely resolve
        const worker_promises = this.create_workers();
        await Promise.all(worker_promises)
        .then(() => {
            console.log("All worker promises resolved");
        })
        .catch((error) => {
            console.error('One or more workers failed', error);
        });

        // Get the end time and total time
        const end = performance.now()
        const totalTime = (end - start) / 1000;

        return [final_array, totalTime];
    }


    /*
    * run_serial_map() -> This function goes through the input array and execute the map function on each of the elements in the array in serial
    * 
    * INPUTS
    *   - arr_len (int) -> The length of the array to be filtered
    *  
    * OUTPUT
    *   - arr (Array) -> The final array after the function executing
    *   - totalTime (float) -> The amount of time that it took to execute the function
    */
    run_serial_map({ array, input_function })
    {
        // Get the start time
        const start = performance.now()
        
        // Go through and execute the predicate function on each of the elements
        for (let i = 0; i < array.length; i++) {
            array[i] = input_function(i);
        }

        // Get the end time and total time
        const end = performance.now();
        const totalTime = (end - start) / 1000;

        return [array, totalTime];
    }
}