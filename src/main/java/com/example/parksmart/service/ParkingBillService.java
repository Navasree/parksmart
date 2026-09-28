package com.example.parksmart.service;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.CheckInOut;
import com.example.parksmart.entity.ParkingBill;
import com.example.parksmart.exception.ResourceNotFoundException;
import com.example.parksmart.repository.BookingRepository;
import com.example.parksmart.repository.CheckInOutRepository;
import com.example.parksmart.repository.ParkingBillRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParkingBillService {

    public static final BigDecimal FIRST_HOUR_RATE = new BigDecimal("30.00");
    public static final BigDecimal ADDITIONAL_HOUR_RATE = new BigDecimal("20.00");
    public static final BigDecimal OVERSTAY_RATE = new BigDecimal("50.00");

    private final BookingRepository bookingRepository;
    private final CheckInOutRepository checkInOutRepository;
    private final ParkingBillRepository parkingBillRepository;

    public ParkingBillService(BookingRepository bookingRepository,
                              CheckInOutRepository checkInOutRepository,
                              ParkingBillRepository parkingBillRepository) {
        this.bookingRepository = bookingRepository;
        this.checkInOutRepository = checkInOutRepository;
        this.parkingBillRepository = parkingBillRepository;
    }

    @Transactional
    public ParkingBill createBill(Long bookingId) {
        if (bookingId == null) {
            throw new IllegalArgumentException("Booking ID cannot be null");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        // Prevent duplicate final bills
        Optional<ParkingBill> existingBill = parkingBillRepository.findByBooking(booking);
        if (existingBill.isPresent()) {
            return existingBill.get();
        }

        CheckInOut checkInOut = checkInOutRepository.findByBooking(booking)
                .orElseThrow(() -> new IllegalStateException("No check-in record found for booking id: " + bookingId));

        if (checkInOut.getCheckInTime() == null) {
            throw new IllegalStateException("Vehicle has not checked in yet");
        }

        LocalDateTime checkInTime = checkInOut.getCheckInTime();
        LocalDateTime scheduledEndTime = booking.getEndTime();
        if (scheduledEndTime == null) {
            throw new IllegalStateException("Booking does not have a scheduled end time");
        }

        LocalDateTime checkOutTime = checkInOut.getActualCheckOutTime();
        if (checkOutTime == null) {
            checkOutTime = LocalDateTime.now();
        }

        if (checkOutTime.isBefore(checkInTime)) {
            throw new IllegalArgumentException("Check-out time cannot be before check-in time");
        }

        long parkingDurationMinutes = Duration.between(checkInTime, checkOutTime).toMinutes();
        if (parkingDurationMinutes < 0) {
            throw new IllegalArgumentException("Parking duration cannot be negative");
        }

        long parkingHours = (long) Math.ceil((double) parkingDurationMinutes / 60.0);

        BigDecimal parkingAmount;
        if (parkingHours <= 1) {
            parkingAmount = FIRST_HOUR_RATE;
        } else {
            BigDecimal additionalHours = BigDecimal.valueOf(parkingHours - 1);
            parkingAmount = FIRST_HOUR_RATE.add(additionalHours.multiply(ADDITIONAL_HOUR_RATE));
        }
        parkingAmount = parkingAmount.setScale(2, RoundingMode.HALF_UP);

        long overstayMinutes;
        long overstayHours;
        BigDecimal overstayPenalty;

        if (!checkOutTime.isAfter(scheduledEndTime)) {
            overstayMinutes = 0L;
            overstayHours = 0L;
            overstayPenalty = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        } else {
            overstayMinutes = Duration.between(scheduledEndTime, checkOutTime).toMinutes();
            if (overstayMinutes <= 0) {
                overstayHours = 0L;
                overstayPenalty = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            } else {
                overstayHours = (long) Math.ceil((double) overstayMinutes / 60.0);
                overstayPenalty = OVERSTAY_RATE.multiply(BigDecimal.valueOf(overstayHours)).setScale(2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal totalAmount = parkingAmount.add(overstayPenalty).setScale(2, RoundingMode.HALF_UP);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Total amount cannot be negative");
        }

        ParkingBill bill = new ParkingBill();
        bill.setBooking(booking);
        bill.setCheckInTime(checkInTime);
        bill.setScheduledEndTime(scheduledEndTime);
        bill.setCheckOutTime(checkOutTime);
        bill.setParkingDurationMinutes(parkingDurationMinutes);
        bill.setParkingHours(parkingHours);
        bill.setFirstHourRate(FIRST_HOUR_RATE);
        bill.setAdditionalHourRate(ADDITIONAL_HOUR_RATE);
        bill.setOverstayRate(OVERSTAY_RATE);
        bill.setParkingAmount(parkingAmount);
        bill.setOverstayMinutes(overstayMinutes);
        bill.setOverstayHours(overstayHours);
        bill.setOverstayPenalty(overstayPenalty);
        bill.setTotalAmount(totalAmount);
        bill.setPaymentStatus(ParkingBill.STATUS_PENDING);
        bill.setCreatedAt(LocalDateTime.now());

        return parkingBillRepository.save(bill);
    }

    public List<ParkingBill> getAllBills() {
        return parkingBillRepository.findAll();
    }

    public ParkingBill getBillById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Bill ID cannot be null");
        }
        return parkingBillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parking bill not found with id: " + id));
    }

    public ParkingBill getBillByBookingId(Long bookingId) {
        if (bookingId == null) {
            throw new IllegalArgumentException("Booking ID cannot be null");
        }
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        return parkingBillRepository.findByBooking(booking)
                .orElseThrow(() -> new ResourceNotFoundException("Parking bill not found for booking id: " + bookingId));
    }

    @Transactional
    public ParkingBill calculateBill(Long bookingId) {
        return createBill(bookingId);
    }

    @Transactional
    public ParkingBill markAsPaid(Long billId) {
        if (billId == null) {
            throw new IllegalArgumentException("Bill ID cannot be null");
        }
        ParkingBill bill = getBillById(billId);
        bill.setPaymentStatus(ParkingBill.STATUS_PAID);
        return parkingBillRepository.save(bill);
    }

    @Transactional
    public void deleteBill(Long billId) {
        if (billId == null) {
            throw new IllegalArgumentException("Bill ID cannot be null");
        }
        ParkingBill bill = getBillById(billId);
        parkingBillRepository.delete(bill);
    }
}
