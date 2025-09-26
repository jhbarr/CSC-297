#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <assert.h>

// map_function() -> This function takes in an integer and either returns its square if
//  the number is even or its cube if the number is odd
// INPUTS
//  - int x -> The number that will be operated on
int map_function(int x)
{
    int sum = 0;
    for (int i = 0; i < x; i++)
    {
        sum += 1;
    }

    return sum;
}

// serial_map() -> This function maps a list of variables into one using a given operation function
// INPUTS
//  - int (*operator_func)(int x) -> This is a pointer to a function that takes in an integer and returns an int
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
void serial_map(int (*operator_func)(int x), int vals[], int len, double *serial_time)
{
    double start = omp_get_wtime();

    for (int i = 0; i < len; i++)
    {
        vals[i] = operator_func(vals[i]);
    }

    double end = omp_get_wtime();
    double time_diff = end - start;

    *serial_time = time_diff;

    printf("Serial\n   Time: %lf\n", time_diff);
}

// parallel_map() -> This function reduces a list of integer values into one using parallel loops
// INPUTS
//  - char operator -> The operator the should be used for the reduction
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
void parallel_map(int (*operator_func)(int x), int vals[], int len, int n_threads, double *parallel_time)
{
    double start = omp_get_wtime();
#pragma omp parallel for num_threads(n_threads)
    for (int i = 0; i < len; i++)
    {
        int val = operator_func(vals[i]);
        vals[i] = val;
    }
    double end = omp_get_wtime();
    double time_diff = end - start;

    *parallel_time = time_diff;

    printf("Parallel\n   Time: %lf\n", time_diff);
}

int main(int argc, char *argv[])
{
    // Instantiate the basic variables for the reduction step
    // These will be taken from the command line
    int len = atoi(argv[1]);
    int MAX_VAL = atoi(argv[2]);

    int vals[len];
    for (int i = 0; i < len; i++)
    {
        int random_val = (rand() % MAX_VAL) + 1;
        vals[i] = random_val;
    }

    // Open the CSV data file
    FILE *fp;
    fp = fopen("Data/map_data.csv", "w"); // Open for writing, overwriting if exists

    if (fp == NULL)
    {
        printf("Error opening file!\n");
        exit(1); // Exit with an error code
    }

    // Write header row
    fprintf(fp, "Thread Count,Trial,Serial Time,Parallel Time, Array Size\n");

    for (int n_threads = 1; n_threads < 9; n_threads++)
    {
        for (int trial = 1; trial < 4; trial++)
        {
            // Create a list of random integer variables of length len with max value MAX_VAL
            int serial_vals[len];
            int parallel_vals[len];

            memcpy(serial_vals, vals, len * sizeof(int));
            memcpy(parallel_vals, vals, len * sizeof(int));

            double parallel_time;
            double serial_time;

            // Calculate parallel result
            parallel_map(map_function, parallel_vals, len, n_threads, &parallel_time);

            // Calculate the serial result
            serial_map(map_function, serial_vals, len, &serial_time);

            // Check that the two results are the same
            assert(memcmp(parallel_vals, serial_vals, len * sizeof(int)) == 0);
            printf("Assertion 1 passed: The two results are the same\n");

            // Write the data to the csv file
            fprintf(fp, "%d,%d,%lf,%lf,%d\n", n_threads, trial, serial_time, parallel_time, len);
        }
    }

    fclose(fp); // Close the file
    printf("Data written to people.csv successfully\n");

    return 0;
}