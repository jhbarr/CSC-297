#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

// map_function() -> This function takes in an integer and either returns its square if
//  the number is even or its cube if the number is odd
// INPUTS
//  - int x -> The number that will be operated on
int map_function(int x)
{
    if (x % 2 == 0)
    {
        return x * x;
    }

    else
    {
        return x * x * x;
    }
}

// serial_map() -> This function maps a list of variables into one using a given operation function
// INPUTS
//  - int (*operator_func)(int x) -> This is a pointer to a function that takes in an integer and returns an int
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
void serial_map(int (*operator_func)(int x), int vals[], int len)
{
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);

    for (int i = 0; i < len; i++)
    {
        vals[i] = operator_func(vals[i]);
    }

    clock_gettime(CLOCK_MONOTONIC, &end);

    double time_diff = (end.tv_sec - start.tv_sec) +
                       (end.tv_nsec - start.tv_nsec) / 1e9;

    // for (int j = 0; j < len; j++)
    //     printf("%d ", vals[j]);
    printf("Serial Time: %lf\n", time_diff);
}

// parallel_map() -> This function reduces a list of integer values into one using parallel loops
// INPUTS
//  - char operator -> The operator the should be used for the reduction
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
void parallel_map(int (*operator_func)(int x), int vals[], int len)
{
    double start = omp_get_wtime();
#pragma omp parallel for
    for (int i = 0; i < len; i++)
    {
        int val = operator_func(vals[i]);
        vals[i] = val;
    }
    double end = omp_get_wtime();

    double time_diff = ((end - start)) / CLOCKS_PER_SEC;

    // Print out the necessary information
    // for (int j = 0; j < len; j++)
    // {
    //     printf("%d ", vals[j]);
    // }
    printf("Parallel Time: %lf\n", time_diff);
}

int main(int argc, char *argv[])
{
    // Instantiate the basic variables for the reduction step
    // These will be taken from the command line
    int len = atoi(argv[1]);
    int MAX_VAL = atoi(argv[2]);

    // Create a list of random integer variables of length len with max value MAX_VAL
    int serial_vals[len];
    int parallel_vals[len];
    for (int i = 0; i < len; i++)
    {
        int random_val = (rand() % MAX_VAL) + 1;
        serial_vals[i] = random_val;
        parallel_vals[i] = random_val;
    }

    // Calculate parallel result
    parallel_map(map_function, parallel_vals, len);

    // Calculate the serial result
    serial_map(map_function, serial_vals, len);

    return 0;

    return 0;
}