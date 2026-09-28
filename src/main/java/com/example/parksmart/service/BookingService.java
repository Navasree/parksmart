package com.example.parksmart.service;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.ParkingSlot;
import com.example.parksmart.exception.ResourceNotFoundException;
import com.example.parksmart.repository.BookingRepository;
import com.example.parksmart.repository.ParkingSlotRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    public static final String BOOKING_PENDING = "PENDING";
    public static final String BOOKING_CONFIRMED = "CONFIRMED";
    public static final String BOOKING_CANCELLED = "CANCELLED";
    public static final String BOOKING_COMPLETED = "COMPLETED";
    public static final String SLOT_AVAILABLE = "AVAILABLE";
    public static final String SLOT_BOOKED = "BOOKED";
    public static final String SLOT_MAINTENANCE = "MAINTENANCE";

    private final BookingRepository bookingRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    public BookingService(BookingRepository bookingRepository, ParkingSlotRepository parkingSlotRepository) {
        this.bookingRepository = bookingRepository;
        this.parkingSlotRepository = parkingSlotRepository;
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
    }

    public List<Booking> getBookingsBySlot(Long slotId) {
        ParkingSlot parkingSlot = parkingSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Parking slot not found with id: " + slotId));
        return bookingRepository.findByParkingSlot(parkingSlot);
    }

    @Transactional
    public Booking createBooking(Booking booking) {
        if (booking.getParkingSlot() == null || booking.getParkingSlot().getId() == null) {
            throw new IllegalArgumentException("Parking slot is required");
        }

        ParkingSlot parkingSlot = parkingSlotRepository.findById(booking.getParkingSlot().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking slot not found with id: " + booking.getParkingSlot().getId()));

        if (SLOT_MAINTENANCE.equalsIgnoreCase(parkingSlot.getStatus())) {
            throw new IllegalArgumentException("Cannot book a slot that is under maintenance");
        }

        if (booking.getStartTime() == null || booking.getEndTime() == null) {
            throw new IllegalArgumentException("Booking start time and end time are required");
        }

        if (!booking.getStartTime().isBefore(booking.getEndTime())) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                parkingSlot,
                booking.getStartTime(),
                booking.getEndTime());

        if (!overlappingBookings.isEmpty()) {
            throw new IllegalStateException("Parking slot is already booked for the requested time");
        }

        booking.setParkingSlot(parkingSlot);
        booking.setStatus(BOOKING_CONFIRMED);
        parkingSlot.setStatus(SLOT_BOOKED);
        parkingSlotRepository.save(parkingSlot);
        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking updateBooking(Long id, Booking booking) {
        Booking existingBooking = getBookingById(id);
        ParkingSlot parkingSlot = parkingSlotRepository.findById(booking.getParkingSlot().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking slot not found with id: " + booking.getParkingSlot().getId()));

        existingBooking.setCustomerName(booking.getCustomerName());
        existingBooking.setVehicleNumber(booking.getVehicleNumber());
        existingBooking.setStartTime(booking.getStartTime());
        existingBooking.setEndTime(booking.getEndTime());
        existingBooking.setParkingSlot(parkingSlot);

        if (booking.getStatus() != null) {
            existingBooking.setStatus(booking.getStatus());
        }

        return bookingRepository.save(existingBooking);
    }

    @Transactional
    public Booking cancelBooking(Long id) {
        Booking booking = getBookingById(id);
        if (BOOKING_CANCELLED.equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalStateException("Booking is already cancelled");
        }

        booking.setStatus(BOOKING_CANCELLED);
        ParkingSlot parkingSlot = booking.getParkingSlot();
        if (parkingSlot != null) {
            parkingSlot.setStatus(SLOT_AVAILABLE);
            parkingSlotRepository.save(parkingSlot);
        }
        return bookingRepository.save(booking);
    }

    @Transactional
    public void deleteBooking(Long id) {
        Booking booking = getBookingById(id);
        bookingRepository.delete(booking);
    }
}
