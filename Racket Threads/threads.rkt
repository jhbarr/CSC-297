#lang racket

; --- CREATING THREADS --- 
; (thread thunk) -> Creates a thread 
; (thread? thd) -> Returns whether an object is a thread
; (current-thread) -> returns the name of the thread that is currently running
; (thread/suspend-to-kill thunk) -> Creates a thread that can be suspended rather than killed
; ------------------------
(printf "CREATING THREADS\n")
(define thread1
    (thread 
        (lambda ()
            (for ([i (in-range 5)])
                (printf "Thread ~a\n" i)
                (sleep 0.2)))))

(printf "Main thread is: ~a\n" (current-thread))
(printf "thread1 is a thread: ~a\n" (thread? thread1))

; Wait for the thread to finish execution
(thread-wait thread1)
(printf "thread1 is done\n")


; --- SUSPENDING THREADS --- 
; (thread-suspend thd) -> suspends the execution of thd and will not resume until thread-resume is called
; (thread-resume thd [benefactor]) -> this resumes a thread that has previously been suspended
;   - The benefactor is a thread (a parent thread?) whose suspension and resumption controls the same
;   for the supplied thread
;   - The benefactor could also be a 'custodian'. COME BACK 
; (kill-thread thd) -> Kill the thread immediately. Or suspend the thread if thread was created with 
;   thread/suspend-to-kill
; (break-thread thd) -> 
; (sleep [secs]) -> Cause the thread to stop execution for a specified amount of time
; ------------------------
(printf "\n\nSUSPENDING THREADS\n")

(define thread2
    (thread 
        (lambda () 
            (printf "Thread2: running\n")
            (sleep 5)
            (printf "Thread2: finishing\n"))))

(sleep 1)
(printf "Suspending thread2\n")
(thread-suspend thread2)

(sleep 2)
(printf "Resuming thread2\n")
(thread-resume thread2)

(sleep 1)
(printf "Killing thread2\n")
(kill-thread thread2)

(printf "thread2 running? ~a\n" (thread-running? thread2))
(printf "thread2 dead? ~a\n" (thread-dead? thread2))


; --- THREAD MAILBOXES --- 
; (thread-send thd v [fail-thunk]) -> Queues a message 'v' to thd without blocking. if thd stops running 
;   before the message is queued, then 'fail-thunk' is called.
; (thread-receive) -> Receives and dequeues a message queued for the current thread. If no messages are 
;   available, then this function blocks until one is received. 
; (thread-try-receive) -> receives and dequeues any message in the queue or returns #f if none are available
; (thread-rewind-receive lst) -> Pushes the elements of lst back onto the front of current thread's queue
; ------------------------
(printf "\n\nHREAD MAILBOXES\n")
(define sender 
    (thread
        (lambda ()
            ; (sleep 1)
            (thread-send receiver "Hello from sender")
            (printf "Sender: message sent\n")
            )))

(define receiver 
    (thread
        (lambda ()
            (printf "Receiver: waiting for message...\n")
            (define msg (thread-receive))
            (printf "Receiver got message: ~a\n" msg)
            )))

;; Wait for both threads
(thread-wait sender)
(thread-wait receiver)