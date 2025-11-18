#lang racket

; Import the future visualization function (only for Dr Racket)
(require racket/future
         future-visualizer)

; Defines a function called 'any-double'
; This takes in a list and returns #t if there are any elements that are doubles of other elements in the list
(define (any-double? l)
  (for/or ([i (in-list l)]) ; Iterates through the list (for/or) iterates and then returns true if any of the iterations evaluate to true
    (for/or ([i2 (in-list l)])
      (= i2 (* 2 i))))) ; See if the current element is a double of i

(define size 10000)

; Create a list of odd numbers starting at 1
(define l1 (for/list ([i (in-range size)])
             (+ (* 2 i) 1)))
; Create a list of odd numbers starting at -1
(define l2 (for/list ([i (in-range size)])
             (- (* 2 i) 1)))
; Create a list of odd numbers starting at 3
(define l3 (for/list ([i (in-range size)])
             (+ (* 2 i) 3)))

; Experiment: Do the two things in sequence.
(define expt2a
  (lambda ()
    (time (or (any-double? l1)
              (any-double? l2)))))

; Experiment: Do the two things in parallel using futures.
(define expt2b
  (lambda ()
    (time (let ([f (future (lambda () (any-double? l2)))]) ; Create a future object that is running the any-double function on l2
            (or (any-double? l1) ; Execute any-double on l1 in the 'main thread'
                (touch f)))))) ; Wait for the future to finish

; Experiment: Do the three things in sequence.
(define expt3a
  (lambda ()
    (time (or (any-double? l1)
              (any-double? l2)
              (any-double? l3)))))

; Experiment: Do the three things in parallel using futures.
(define expt3b
  (lambda ()
    (time (let ([f2 (future (lambda () (any-double? l2)))]
                [f3 (future (lambda () (any-double? l3)))])
            (or (any-double? l1)
                (touch f2)
                (touch f3))))))

;;;