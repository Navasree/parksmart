package com.example.parksmart.service;

import com.example.parksmart.entity.ParkingLot;
import com.example.parksmart.entity.ParkingSlot;
import com.example.parksmart.exception.ResourceNotFoundException;
import com.example.parksmart.repository.ParkingSlotRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParkingSlotService {

    private static final String SLOT_AVAILABLE = "AVAILABLE";

    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingLotService parkingLotService;

    public ParkingSlotService(ParkingSlotRepository parkingSlotRepository, ParkingLotService parkingLotService) {
        this.parkingSlotRepository = parkingSlotRepository;
        this.parkingLotService = parkingLotService;
    }

    public List<ParkingSlot> getAllSlots() {
        return parkingSlotRepository.findAll();
    }

    public ParkingSlot getSlotById(Long id) {
        return parkingSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parking slot not found with id: " + id));
    }

    public List<ParkingSlot> getSlotsByParkingLot(Long parkingLotId) {
        ParkingLot parkingLot = parkingLotService.getParkingLotById(parkingLotId);
        return parkingSlotRepository.findByParkingLot(parkingLot);
    }

    public List<ParkingSlot> getAvailableSlots() {
        return parkingSlotRepository.findByStatus(SLOT_AVAILABLE);
    }

    @Transactional
    public ParkingSlot createSlot(ParkingSlot slot) {
        Long parkingLotId = slot.getParkingLot().getId();
        ParkingLot parkingLot = parkingLotService.getParkingLotById(parkingLotId);
        slot.setParkingLot(parkingLot);
        return parkingSlotRepository.save(slot);
    }

    @Transactional
    public ParkingSlot updateSlot(Long id, ParkingSlot slot) {
        ParkingSlot existingSlot = getSlotById(id);
        Long parkingLotId = slot.getParkingLot() != null ? slot.getParkingLot().getId() : existingSlot.getParkingLot().getId();
        ParkingLot parkingLot = parkingLotService.getParkingLotById(parkingLotId);

        existingSlot.setSlotNumber(slot.getSlotNumber());
        existingSlot.setVehicleType(slot.getVehicleType());
        existingSlot.setStatus(slot.getStatus());
        existingSlot.setParkingLot(parkingLot);

        return parkingSlotRepository.save(existingSlot);
    }

    @Transactional
    public void deleteSlot(Long id) {
        ParkingSlot parkingSlot = getSlotById(id);
        if ("OCCUPIED".equalsIgnoreCase(parkingSlot.getStatus())) {
            throw new IllegalStateException("Cannot delete an occupied parking slot. Please checkout the vehicle first.");
        }
        parkingSlotRepository.delete(parkingSlot);
    }
}
