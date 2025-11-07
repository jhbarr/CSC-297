#lang racket

; --- CHANNELS --- 
; Channels are a way for two threads to communicate with each other. A channel synchronizes
; a pair of threads and then atomically passes the information between the two. 
; Multiple threads can communicate across a channel, but only two can participate in communication
; at one time. 
;
; (make-channel) -> Creates and returns a new channel.
; (channel? v) -> Returns whether an object is a channel
; (channel-get ch) -> Blocks until a sender is ready to provide through the channel 'ch'
; (channel-try-get ch) -> Receives and returns a value from ch if a sender is immediately ready
;   otherwise it returns #f 
; (channel-put ch v) -> Blocks until a receiver is ready to accept the value 'v' through 'ch'
; (channel-put-evt ch v) -> Returns a new event COME BACK
; ------------------------
(printf "CHANNELS\n")

(define ch (make-channel))

(thread (lambda ()
    (sleep 1)
    (channel-put ch "Data from thread")
    ))

(printf "Main thread waiting for channel-get...\n")
(define v (channel-get ch))
(printf "Got value: ~a\n" v)


; --- SEMAPHORES --- 
; A semaphor is a counted mutex. It maintains an internal counter, whose max value is always at least 1000
; When this counter reaches 0, it precents any thread from entering its critical region. 
; The documentation promises that the semaphore waiting is fair - meaning that if a thread is waiting for long enough
; it should always be able to enter the critical region. 

; (semaphore? v) -> Returns whether 'v' is a semaphore
; (make-semaphore [init]) -> This creates and returns a new semaphore with the internal counter set to 'init'
;     - Init must be a non-negative integer not greater than the semaphore's max value
; (semaphore-post sema) -> Increments the semaphore's internal counter
; (semaphore-wait sema) -> Blocks until the internal counter for semaphore is non-zero. 
;     When the counter is non-zero, the counter is decremented
; (semaphore-try-wait? sema) -> This is like semaphore-wait, but it never blocks execution. 
;     If the counter is zero, this function returns #f immediately
; ------------------------
(printf "\n\nSEMAPHORES\n")
(define sem (make-semaphore 1))

(define (worker name)
    (thread (lambda ()
        (semaphore-wait sem)
        (printf "~a: entered the critical region~n" name)
        (sleep 1)
        (printf "~a: leaving critical region~n" name)
        (semaphore-post sem)
        )))

(define t1 (worker "A"))
(define t2 (worker "B"))

(thread-wait t2)
(thread-wait t1)


; --- BUFFERED ASYNCHRONOUS CHANNELS --- 
; An asychronous channel is like a channel, but it buffers so that a send operation does not 
; wait on a receive operation. 
;
; (async-channel? v) -> Returns whether an object is an async channel
; (make-async-channel [limit]) -> Returns an async channel with a buffer limit of 'limit' items
;     A get operation blocks when the channel is empty
;     A put operations blocks when the channel has 'limit' elements 
;     If limit is #f, then the channel does not have a buffer limit and put will never blocking.
; (async-channel-get ach) -> Blocks until at least one value is available in ach
; (async-channel-try-get ach) -> If at least one value is immediately available in ach, it will return that one
;     If there is nothing in the channel, then this function will return false
; (async-channel-put ach v) -> puts 'v' into 'ach', blocking if ach's buffer is full
; ------------------------
(printf "\n\nASYNC CHANNELS\n")
(require racket/async-channel)

(define buf (make-async-channel 3)) ; buffer size 3

; Producer
(define t5 (thread (λ ()
          (for ([i (in-list '(a b c d e f g))])
            (async-channel-put buf i)
            (printf "Producer put ~a~n" i)
            (sleep 0.2)))))

; Consumer
(define t3 (thread (λ ()
          (let loop ()
            (define v (async-channel-get buf))
            (printf "Consumer got ~a~n" v)
            (when (not (equal? v 'done))
              (loop))))))

; After producing some items, put a sentinel
(define t4 (thread (λ ()
          (sleep 0.75)
          (async-channel-put buf 'done))))


(thread-wait t3)
(thread-wait t4)
(thread-wait t5)