#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <stdbool.h>
#include <unistd.h>

// void think() -> This just prints out that a thread is thinking
//
// INPUTS
//  - int tid -> The id of the thread that is thinking
void think(int tid)
{
    printf("Thread %d is thinking\n", tid);
    return;
}

// void eat() -> Prints that a thread is eating
//
// INPUTS
//  - int tid -> The id of the thread that is eating
void eat(int tid)
{
    printf("Thread %d is eating\n", tid);
    return;
}

// void philosophers_eat() -> This runs the dining philosophers problem
//
// INPUTS
// - int num_threads -> This is the number of threads that should be running
void philosophers_eat(int n_threads)
{
    // Initialize chopstick lock
    omp_lock_t chopsticks[n_threads];
    for (int i = 0; i < n_threads; i++)
    {
        omp_init_lock(&chopsticks[i]);
    }

#pragma omp parallel num_threads(n_threads)
    {
        int tid = omp_get_thread_num();
        int left = tid;
        int right = (tid + 1) % n_threads;

        // Each thread tries to each three times
        for (int round = 0; round < n_threads; round++)
        {
            // Have the threads think
            think(tid);

            // Have the thread pick up the chopsticks
            omp_set_lock(&chopsticks[left]);
            omp_set_lock(&chopsticks[right]);

            // Have the thread eat
            eat(tid);

            // Put down the chopsticks
            omp_unset_lock(&chopsticks[left]);
            omp_unset_lock(&chopsticks[right]);
        }
    }

    // destroy locks
    for (int i = 0; i < n_threads; i++)
    {
        omp_destroy_lock(&chopsticks[i]);
    }
}

int main(int argc, char *argv[])
{
    int n_threads = atoi(argv[1]);
    philosophers_eat(n_threads);

    return 0;
}