package com.example.parksmart.service;

import com.example.parksmart.entity.ParkingLot;
import com.example.parksmart.exception.ResourceNotFoundException;
import com.example.parksmart.repository.ParkingLotRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParkingLotService {

    private final ParkingLotRepository parkingLotRepository;

    public ParkingLotService(ParkingLotRepository parkingLotRepository) {
        this.parkingLotRepository = parkingLotRepository;
    }

    public List<ParkingLot> getAllParkingLots() {
        return parkingLotRepository.findAll();
    }

    public ParkingLot getParkingLotById(Long id) {
        return parkingLotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found with id: " + id));
    }

    @Transactional
    public ParkingLot createParkingLot(ParkingLot parkingLot) {
        return parkingLotRepository.save(parkingLot);
    }

    @Transactional
    public ParkingLot updateParkingLot(Long id, ParkingLot parkingLot) {
        ParkingLot existingLot = getParkingLotById(id);
        existingLot.setName(parkingLot.getName());
        existingLot.setLocation(parkingLot.getLocation());
        existingLot.setTotalSlots(parkingLot.getTotalSlots());
        return parkingLotRepository.save(existingLot);
    }

    @Transactional
    public void deleteParkingLot(Long id) {
        ParkingLot parkingLot = getParkingLotById(id);
        parkingLotRepository.delete(parkingLot);
    }
}
