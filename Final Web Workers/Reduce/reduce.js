/*
------ MAIN REDUCE CLASS ------
This class is used to execute the logic involved in running parallelized reduce using 
javascript web workers
-------------------------
*/

export default class Reduce
{
    // Instance variables
    thread_count;
    worker_pool = [];
    block_size = 1; // Default block size value

    input_array_buffer = null;
    reduction_array_buffer = null;
    input_function = null;
    index_chunk_array = [];
    index_info_buffer = null;

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

        // Create the reduction array buffer
        const reduction_array_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Math.ceil(array.length / this.block_size));
        this.reduction_array_buffer = reduction_array_buffer;

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
    }


    /*
    * update_instance_vars() -> This function updates the class's working array and reduction array so that they can be used in another
    * iteration of parallelized reduction
    * 
    * INPUTS
    *   - None
    * OUTPUTS
    *   - None
    */
    update_instance_vars()
    {   
        // Make the reduction array the new input array
        this.input_array_buffer = this.reduction_array_buffer;

        // Create a new reduction array buffer
        const input_array_array_len = this.input_array_buffer.byteLength / Int32Array.BYTES_PER_ELEMENT;
        const reduction_arr_len = Math.ceil(input_array_array_len / this.block_size);
        this.reduction_array_buffer = new SharedArrayBuffer(reduction_arr_len * Int32Array.BYTES_PER_ELEMENT);

        // Create the shared memofy buffer and array wrapper for the index info array
        const index_info_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
        const index_info_array = new Int32Array(index_info_buffer);
        this.index_info_buffer = index_info_buffer;

        index_info_array[0] = 0;
        index_info_array[1] = Math.ceil(input_array_array_len / this.block_size);

        // Create the index chunk array
        const index_chunk_array = [];
        for (let i = 0; i < input_array_array_len; i += this.block_size)
        {
            const start = i;
            const end = Math.min(i + this.block_size, input_array_array_len);
            index_chunk_array.push([start, end]);
        }
        this.index_chunk_array = index_chunk_array;
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
            const worker = new Worker('./Reduce/reduce_worker.js');
            worker_pool.push(worker);
        }

        return worker_pool;
    }



    /*
    * batch_workers() -> This function creates an array of worker promise objects. These promises are used to keep
    * track of when all of the workers have finished their tasks
    * 
    * INPUTS
    *   - worker_pool : Array[Worker] -> The array of workers that should execute the parallel filter
    * OUTPUTS
    *   - worker_promises : Array[Worker] -> An array of promise objects that keep track of the status of each worker
    */
    batch_workers()
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
                    reduction_array_buffer: this.reduction_array_buffer,
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
    * run_parallel_reduce() -> This function executes the parallel reduce on the specified array using the specified function
    * 
    * INPUTS 
    *   - array : Array[Any] -> An array of any type. NOTE - each element in the array must be of the same type
    *   - input_function : Function -> The filtration predicate function that will be executed on each array element
    * OUTPUTS
    *   - final_array : Array[Any] -> The final filtered array
    *   - total_time : float -> The time it took for the filtration to execute
    */
    async run_parallel_reduce({ array, input_function, block_size })
    {
        // Initialize the instance variables
        this.initialize_instance_vars(array, input_function, block_size);

        // Get the current time
        const start = performance.now();

        // initialize the worker promise objects
        // Wait for all of the workers to finish
        //  1. Once the workers finish, if the reduction array is smaller than some threshold, finalize the reduce value
        //  2. If the reduction array is above the threshold, update working and reduction array, then dispatch another round of worker tasks
        let input_array_len = this.input_array_buffer.byteLength / Int32Array.BYTES_PER_ELEMENT;
        const THRESHOLD = 5;
        // const worker_promises = this.create_workers();
        while (input_array_len > THRESHOLD)
        {
            const worker_promises = this.batch_workers();
            await Promise.all(worker_promises)
            .then(() => {
                console.log("All worker promises resolved");
            })
            .catch((error) => {
                console.error('One or more workers failed', error);
            });
            
            this.update_instance_vars();
            input_array_len = this.input_array_buffer.byteLength / Int32Array.BYTES_PER_ELEMENT;
        }

        // Use serial reduce to come to a final value
        const final_array = new Int32Array(this.input_array_buffer);
        const final_res =  final_array.slice(1).reduce(input_function, final_array[0]); 

        // Get the end time and total time
        const end = performance.now()
        const totalTime = (end - start) / 1000;
        
        // Return the value
        return [final_res, totalTime];
    }


    /*
    * run_serial_reduce() -> This function reduces an array of given size in sequence
    * 
    * INPUTS
    *   - array : Array[Any] -> The array that shoul be reduced
    *   - input_function : Function -> The function used to reduce the array
    * 
    *   - res (Array) -> The final result produced by the reduction function
    *   - totalTime (float) -> The amount of time that it took to execute the function
    */
    run_serial_reduce({ array, input_function })
    {
        // Get the start time
        const start = performance.now()

        let final_res = array[0];
        for (let i = 1; i < array.length; i++)
        {
            final_res = input_function(final_res, array[i]);
        }

        // Get the total elapsed time
        const end = performance.now();
        const totalTime = (end - start) / 1000;

        return [final_res, totalTime]
    }
}