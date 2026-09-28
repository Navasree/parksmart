package com.example.parksmart.service;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.CheckInOut;
import com.example.parksmart.entity.ParkingSlot;
import com.example.parksmart.exception.ResourceNotFoundException;
import com.example.parksmart.repository.BookingRepository;
import com.example.parksmart.repository.CheckInOutRepository;
import com.example.parksmart.repository.ParkingSlotRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckInOutService {

    public static final double PENALTY_RATE_PER_MINUTE = 10.0;
    public static final String STATUS_CHECKED_IN = "CHECKED_IN";
    public static final String STATUS_CHECKED_OUT = "CHECKED_OUT";
    public static final String BOOKING_CONFIRMED = "CONFIRMED";
    public static final String BOOKING_COMPLETED = "COMPLETED";
    public static final String BOOKING_CANCELLED = "CANCELLED";
    public static final String SLOT_OCCUPIED = "OCCUPIED";
    public static final String SLOT_AVAILABLE = "AVAILABLE";

    private final BookingRepository bookingRepository;
    private final CheckInOutRepository checkInOutRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingBillService parkingBillService;

    public CheckInOutService(BookingRepository bookingRepository,
                            CheckInOutRepository checkInOutRepository,
                            ParkingSlotRepository parkingSlotRepository,
                            ParkingBillService parkingBillService) {
        this.bookingRepository = bookingRepository;
        this.checkInOutRepository = checkInOutRepository;
        this.parkingSlotRepository = parkingSlotRepository;
        this.parkingBillService = parkingBillService;
    }

    public List<CheckInOut> getAllCheckInOuts() {
        return checkInOutRepository.findAll();
    }

    public CheckInOut getCheckInOutById(Long id) {
        return checkInOutRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Check-in/out record not found with id: " + id));
    }

    @Transactional
    public CheckInOut checkIn(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        if (BOOKING_CANCELLED.equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalStateException("Cannot check in a cancelled booking");
        }

        if (checkInOutRepository.findByBooking(booking).isPresent()) {
            throw new IllegalStateException("Booking is already checked in");
        }

        CheckInOut checkInOut = new CheckInOut();
        checkInOut.setBooking(booking);
        checkInOut.setCheckInTime(LocalDateTime.now());
        checkInOut.setExpectedCheckOutTime(booking.getEndTime());
        checkInOut.setStatus(STATUS_CHECKED_IN);

        ParkingSlot parkingSlot = booking.getParkingSlot();
        parkingSlot.setStatus(SLOT_OCCUPIED);
        parkingSlotRepository.save(parkingSlot);

        return checkInOutRepository.save(checkInOut);
    }

    @Transactional
    public CheckInOut checkOut(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        CheckInOut checkInOut = checkInOutRepository.findByBooking(booking)
                .orElseThrow(() -> new ResourceNotFoundException("No check-in record found for booking id: " + bookingId));

        if (STATUS_CHECKED_OUT.equalsIgnoreCase(checkInOut.getStatus())) {
            // Already checked out; ensure bill exists and handle safely without creating duplicate bill
            parkingBillService.createBill(bookingId);
            return checkInOut;
        }

        LocalDateTime actualCheckOutTime = LocalDateTime.now();
        checkInOut.setActualCheckOutTime(actualCheckOutTime);

        if (actualCheckOutTime.isAfter(checkInOut.getExpectedCheckOutTime())) {
            long overstayMinutes = Duration.between(checkInOut.getExpectedCheckOutTime(), actualCheckOutTime).toMinutes();
            checkInOut.setOverstayMinutes(overstayMinutes);
            checkInOut.setPenaltyAmount(overstayMinutes * PENALTY_RATE_PER_MINUTE);
        } else {
            checkInOut.setOverstayMinutes(0L);
            checkInOut.setPenaltyAmount(0.0);
        }

        checkInOut.setStatus(STATUS_CHECKED_OUT);

        ParkingSlot parkingSlot = booking.getParkingSlot();
        if (parkingSlot != null) {
            parkingSlot.setStatus(SLOT_AVAILABLE);
            parkingSlotRepository.save(parkingSlot);
        }

        booking.setStatus(BOOKING_COMPLETED);
        bookingRepository.save(booking);

        checkInOut = checkInOutRepository.save(checkInOut);

        // Billing integration: Calculate duration, hours, amount, overstay, penalty, total, create and save ParkingBill
        parkingBillService.createBill(bookingId);

        return checkInOut;
    }
}
